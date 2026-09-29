import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// `next.config.mjs` is plain JS with no declaration file and `allowJs` is false,
// so this import is implicitly `any`. Suppress exactly that one error and give
// the value a real type immediately, rather than letting `any` spread into the
// assertions below. If a declaration file is ever added, @ts-expect-error turns
// into an error itself, which is the right prompt to delete this.
// @ts-expect-error -- no declaration file for a .mjs config
import rawNextConfig from "../next.config.mjs";

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};
type NextConfigShape = {
  poweredByHeader?: boolean;
  headers?: () => Promise<HeaderRule[]>;
};

const nextConfig = rawNextConfig as NextConfigShape;

/**
 * T1 — the security headers and the nonce CSP.
 *
 * The invariant being pinned is the oldest in the project and, until now, held by
 * nothing but a comment. Next.js emits two **inline** `<script>` tags for the
 * hydration payload, so a flat `script-src 'self'` blocks hydration on every
 * page. The fix is a per-request nonce written onto the *request* header in
 * `src/proxy.ts`, which is where the renderer looks for it before stamping those
 * inline tags.
 *
 * The regression that would break the whole app: moving the CSP back into
 * `next.config.mjs`, where headers are constant and therefore cannot carry a
 * per-request nonce. That is why the last describe asserts a **negative** — the
 * config must declare no CSP at all — which neither testing the config's headers
 * nor testing the proxy's output would catch on its own.
 *
 * What this cannot reach, deliberately: whether Next stamps `nonce=` onto the
 * inline tags. That needs a built server, and it is Next's behaviour rather than
 * ours — crucially it *cannot* fail silently, because a Next that stopped
 * honouring `x-nonce` would fail to hydrate every page on first load. The silent
 * failure is someone simplifying **our** CSP, which is what the cases below
 * catch. Verified by hand against `next start` twice, in Phase 0 and Checkpoint 1.
 */

const session = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("iron-session", () => ({
  getIronSession: async () => session.value ?? {},
  nextProxyCookies: () => ({ read: () => undefined, write: () => undefined }),
}));

const { proxy } = await import("./proxy");

const NONCE = /nonce-([a-f0-9]{32})/;

function request(path: string): NextRequest {
  return new NextRequest(new URL(`https://ledger.test${path}`));
}

/** The nonce the proxy put on the CSP it returns. */
function nonceOf(csp: string | null): string {
  expect(csp, "no Content-Security-Policy on the response").not.toBeNull();
  const found = csp!.match(NONCE);
  expect(found, `no nonce in: ${csp}`).not.toBeNull();
  return found![1]!;
}

beforeEach(() => {
  session.value = { userId: "user_1", role: "OWNER", establishmentId: "est_1" };
});

describe("the nonce CSP", () => {
  it("puts a nonce on a dynamic page's policy", async () => {
    const response = await proxy(request("/owner"));

    // A pass-through, not a redirect — /owner is this session's own area.
    expect(response.headers.get("location")).toBeNull();
    const nonce = nonceOf(response.headers.get("content-security-policy"));
    expect(nonce).toHaveLength(32);
  });

  it("names the nonce in script-src, not merely somewhere in the policy", async () => {
    const response = await proxy(request("/owner"));
    const csp = response.headers.get("content-security-policy")!;
    const nonce = nonceOf(csp);

    const scriptSrc = csp
      .split(";")
      .map((d) => d.trim())
      .find((d) => d.startsWith("script-src"))!;
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
  });

  it("gives every request its own nonce", async () => {
    const first = nonceOf(
      (await proxy(request("/owner"))).headers.get("content-security-policy"),
    );
    const second = nonceOf(
      (await proxy(request("/owner"))).headers.get("content-security-policy"),
    );
    // A constant nonce is no nonce at all.
    expect(first).not.toBe(second);
  });

  it("hands the same nonce to the renderer on the request headers", async () => {
    const response = await proxy(request("/owner"));
    const nonce = nonceOf(response.headers.get("content-security-policy"));

    // The load-bearing half: the renderer reads x-nonce off the *request*, and a
    // policy whose nonce the renderer never sees blocks its own scripts.
    const overridden = response.headers.get("x-middleware-override-headers");
    expect(overridden, "the proxy set no request headers at all").not.toBeNull();
    expect(overridden).toContain("x-nonce");
    expect(response.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
  });

  it("carries the policy on a redirect too", async () => {
    session.value = null;
    const response = await proxy(request("/owner"));

    expect(response.headers.get("location")).toContain("/login");
    nonceOf(response.headers.get("content-security-policy"));
  });

  /**
   * Under Vitest `NODE_ENV` is "test", so `proxy()` takes the dev branch. These
   * stub it to "production" — and assert **two-sided**, because `'unsafe-eval'`
   * reaching production is a real weakening rather than merely the wrong branch.
   */
  describe("in production", () => {
    beforeEach(() => {
      vi.stubEnv("NODE_ENV", "production");
    });
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("uses 'strict-dynamic' and never 'unsafe-eval'", async () => {
      const csp = (await proxy(request("/owner"))).headers.get(
        "content-security-policy",
      )!;

      expect(csp).toContain("'strict-dynamic'");
      expect(csp).not.toContain("'unsafe-eval'");
    });

    it("still carries a per-request nonce", async () => {
      const csp = (await proxy(request("/owner"))).headers.get(
        "content-security-policy",
      )!;
      expect(nonceOf(csp)).toHaveLength(32);
    });
  });

  it("development takes the other branch, which is why the bug hides locally", async () => {
    // NODE_ENV is "test" here, so this is the dev branch. Stated as a case
    // rather than a comment: the two branches differing is the whole reason a
    // production-only CSP failure can pass every local check.
    const csp = (await proxy(request("/owner"))).headers.get(
      "content-security-policy",
    )!;

    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("'strict-dynamic'");
  });

  it("never lets script-src fall back to a bare 'self'", async () => {
    // The literal Phase 0 regression: a flat `script-src 'self'` blocks the two
    // inline hydration tags, and every page in the app stops hydrating.
    for (const mode of ["test", "production"]) {
      vi.stubEnv("NODE_ENV", mode);
      const csp = (await proxy(request("/owner"))).headers.get(
        "content-security-policy",
      )!;
      const scriptSrc = csp
        .split(";")
        .map((d) => d.trim())
        .find((d) => d.startsWith("script-src"))!;

      expect(scriptSrc, mode).not.toBe("script-src 'self'");
      expect(scriptSrc, mode).toMatch(NONCE);
      vi.unstubAllEnvs();
    }
  });

  it("permits the service worker in both branches", async () => {
    // worker-src resolves through script-src when absent, where production's
    // 'strict-dynamic' makes 'self' inert — so /sw.js would be refused on Render
    // and nowhere else. Pinned so the directive is not removed as redundant.
    for (const mode of ["test", "production"]) {
      vi.stubEnv("NODE_ENV", mode);
      const csp = (await proxy(request("/owner"))).headers.get(
        "content-security-policy",
      )!;
      expect(csp, mode).toContain("worker-src 'self'");
      vi.unstubAllEnvs();
    }
  });

  it("locks down the directives that matter", async () => {
    const csp = (await proxy(request("/owner"))).headers.get(
      "content-security-policy",
    )!;

    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("default-src 'self'");
  });
});

describe("next.config.mjs", () => {
  async function headerMap(): Promise<Map<string, string>> {
    const rules = await nextConfig.headers!();
    const all = rules.flatMap((rule) => rule.headers);
    return new Map(all.map((h) => [h.key.toLowerCase(), h.value]));
  }

  it("declares the five constant security headers", async () => {
    const headers = await headerMap();

    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(headers.get("permissions-policy")).toBe(
      "camera=(), geolocation=(), microphone=()",
    );
    expect(headers.get("strict-transport-security")).toBe(
      "max-age=63072000; includeSubDomains",
    );
  });

  it("applies them to every path", async () => {
    const rules = await nextConfig.headers!();
    expect(rules.some((rule) => rule.source === "/:path*")).toBe(true);
  });

  it("does not declare a Content-Security-Policy", async () => {
    // The regression guard. A header declared here is *constant*, so a CSP moved
    // into this file cannot carry a per-request nonce — and the two inline
    // hydration scripts would be blocked on every page in the app, with the
    // proxy's own tests still passing.
    const headers = await headerMap();
    expect([...headers.keys()]).not.toContain("content-security-policy");
  });

  it("keeps the X-Powered-By header off", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});

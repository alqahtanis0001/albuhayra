import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Brevo delivery and the templates (docs/BACKEND.md v1.1e "Email" + A7, A13).
 * `fetch` is always mocked: no test here, or anywhere, reaches Brevo.
 *
 * The logging rules are the security property: a failure logs the status,
 * Brevo's error code and the recipient's domain — never the API key, the
 * code, or the whole address.
 */

vi.mock("server-only", () => ({}));

const KEY = "xkeysib-test-secret-key";
const TO = "salem.alshehri@example.com";
const CODE = "482915";

const fetchMock = vi.fn();
let logged: string[] = [];

beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BREVO_API_KEY", KEY);
  vi.stubEnv("MAIL_FROM", "sender@example.com");
  vi.stubEnv("APP_URL", "https://ledger.example.com");
  logged = [];
  const capture = (...args: unknown[]) => void logged.push(args.map(String).join(" "));
  vi.spyOn(console, "error").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
  vi.spyOn(console, "log").mockImplementation(capture);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

async function load() {
  const send = await import("./send");
  const templates = await import("./templates");
  const { t } = await import("@/i18n/ar");
  const limits = await import("../rateLimit");
  limits.resetAllAttempts();
  return { ...send, ...templates, t };
}

function expectNoSecretsLogged(): void {
  const all = logged.join("\n");
  expect(all).not.toContain(KEY);
  expect(all).not.toContain(CODE);
  expect(all).not.toContain("salem.alshehri");
}

describe("sendMail", () => {
  it("posts one message to Brevo's REST API with the key in its header and a timeout", async () => {
    const { sendMail, verifyMail, t } = await load();
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));

    expect(await sendMail(verifyMail(TO, CODE))).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/smtp/email");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["api-key"]).toBe(KEY);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body as string);
    expect(body.sender).toEqual({ name: t.mail.senderName, email: "sender@example.com" });
    expect(body.to).toEqual([{ email: TO }]);
    expect(body.subject).toBe(t.mail.verifySubject);
    expect(body.htmlContent).toContain(CODE);
    expect(body.textContent).toContain(CODE);
  });

  it("a refusal logs status, Brevo's code and the domain only", async () => {
    const { sendMail, verifyMail } = await load();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "unauthorized", message: `Key ${KEY} not found for ${TO}` }), {
        status: 401,
      }),
    );
    expect(await sendMail(verifyMail(TO, CODE))).toBe(false);
    expect(logged.join("\n")).toContain("401 unauthorized (to @example.com)");
    expectNoSecretsLogged();
  });

  it("a network failure or timeout logs the error's name only, and never throws", async () => {
    const { sendMail, verifyMail } = await load();
    fetchMock.mockRejectedValue(Object.assign(new Error(`timeout for ${TO} ${KEY}`), { name: "TimeoutError" }));
    expect(await sendMail(verifyMail(TO, CODE))).toBe(false);
    expect(logged.join("\n")).toContain("TimeoutError");
    expectNoSecretsLogged();
  });

  it("without a key it sends nothing and warns once, in development", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    const { sendMail, verifyMail } = await load();
    await sendMail(verifyMail(TO, CODE));
    await sendMail(verifyMail(TO, CODE));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logged).toHaveLength(1);
    expectNoSecretsLogged();
  });

  it("without a key in production it logs an error on every send (A7)", async () => {
    vi.stubEnv("BREVO_API_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    const { sendMail, verifyMail } = await load();
    await sendMail(verifyMail(TO, CODE));
    await sendMail(verifyMail(TO, CODE));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logged).toHaveLength(2);
  });
});

describe("deliver — the mail caps skip silently (A7)", () => {
  it("per recipient per hour", async () => {
    const { deliver, verifyMail } = await load();
    fetchMock.mockImplementation(async () => new Response("{}", { status: 201 }));
    const sent = [];
    for (let i = 0; i < 7; i += 1) sent.push(await deliver(verifyMail(TO, CODE), `10.0.0.${i}`));
    expect(sent).toEqual([true, true, true, true, true, false, false]);
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it("per sending IP per day", async () => {
    const { deliver, verifyMail } = await load();
    fetchMock.mockImplementation(async () => new Response("{}", { status: 201 }));
    let sent = 0;
    for (let i = 0; i < 25; i += 1) {
      if (await deliver(verifyMail(`user${i}@example.com`, CODE), "10.9.9.9")) sent += 1;
    }
    expect(sent).toBe(20);
  });
});

describe("templates", () => {
  it("are Arabic, right to left, with the code large, left-to-right and in Western digits", async () => {
    const { verifyMail, resetMail, t } = await load();
    for (const [message, intro] of [
      [verifyMail(TO, CODE), t.mail.verifyIntro],
      [resetMail(TO, CODE), t.mail.resetIntro],
    ] as const) {
      expect(message.html).toContain('<html dir="rtl" lang="ar">');
      expect(message.html).toMatch(new RegExp(`<p dir="ltr"[^>]*>${CODE}</p>`));
      expect(message.html).toContain(intro);
      expect(message.html).toContain(t.mail.expiry);
      expect(message.html).toContain(t.mail.ignore);
      expect(message.text).toContain(CODE);
      expect(message.text).toContain(t.mail.expiry);
    }
  });

  it("show the green wordmark from APP_URL, or the name as text without it", async () => {
    let { verifyMail } = await load();
    expect(verifyMail(TO, CODE).html).toContain(
      '<img src="https://ledger.example.com/brand/zakham-brand/zakham-wordmark-green.png"',
    );
    vi.stubEnv("APP_URL", "");
    vi.resetModules();
    ({ verifyMail } = await load());
    expect(verifyMail(TO, CODE).html).not.toContain("<img");
    vi.stubEnv("APP_URL", "javascript:alert(1)");
    vi.resetModules();
    ({ verifyMail } = await load());
    expect(verifyMail(TO, CODE).html).not.toContain("javascript:");
  });

  it("carry no user-supplied text: only the recipient address, and only in the envelope (A13)", async () => {
    const { verifyMail, resetMail, existsMail } = await load();
    for (const message of [verifyMail(TO, CODE), resetMail(TO, CODE), existsMail(TO)]) {
      expect(message.html).not.toContain("salem");
      expect(message.text).not.toContain("salem");
      expect(message.to).toBe(TO);
    }
  });

  it("the 'already registered' mail carries no code", async () => {
    const { existsMail, t } = await load();
    const message = existsMail(TO);
    expect(message.subject).toBe(t.mail.existsSubject);
    expect(message.text).not.toMatch(/\d{6}/);
  });

  it("refuse anything but six digits as a code", async () => {
    const { verifyMail } = await load();
    expect(() => verifyMail(TO, "<b>x</b>")).toThrow();
  });
});

import { readFileSync } from "node:fs";

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

/* ------------------------------------------------------------ v1.2c digest */

describe("escapeHtml and plainLine (C7, E7)", () => {
  it("escapeHtml turns the five characters into entities and nothing else", async () => {
    const { escapeHtml } = await import("./escape");
    expect(escapeHtml(`<script>alert("x")</script> & 'y'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;",
    );
    expect(escapeHtml("مؤسسة الأمل 123")).toBe("مؤسسة الأمل 123");
  });

  it("plainLine removes CR/LF and control characters, keeps the rest raw", async () => {
    const { plainLine } = await import("./escape");
    const LS = String.fromCharCode(0x2028);
    const TAB = String.fromCharCode(9);
    expect(plainLine(`a\r\nBcc: x@example.com${TAB}b${LS}c`)).toBe("a Bcc: x@example.com b c");
    expect(plainLine(`<b> & "q"`)).toBe(`<b> & "q"`);
  });
});

describe("digestMail (C6, C7, E7)", () => {
  const HOSTILE = `<img src=x onerror="alert(1)"> & 'q' $& $'`;
  const row = (partyName: string, planTitle: string, direction: "IN" | "OUT", remainingHalalas: number) => ({
    partyName, planTitle, direction, remainingHalalas, dueDate: "2026-10-01",
  });
  const empty = { rows: [], moreCount: 0, totalInHalalas: 0, totalOutHalalas: 0 };
  function input(name = HOSTILE) {
    return {
      establishmentName: name,
      groups: {
        overdue: { rows: [row(HOSTILE, "عقد <b>", "IN", 123456)], moreCount: 3, totalInHalalas: 999900, totalOutHalalas: 50 },
        today: empty,
        tomorrow: { rows: [row("مورد", "توريد", "OUT", 5000)], moreCount: 0, totalInHalalas: 0, totalOutHalalas: 5000 },
        upcoming: empty,
      },
    };
  }

  it("escapes every owner-entered string in the HTML part", async () => {
    const { digestMail } = await load();
    const { html } = digestMail(TO, input());
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;q&#39; $&amp; $&#39;");
    expect(html).toContain("عقد &lt;b&gt;");
  });

  it("keeps the subject and text raw but on one line, and never expands $& or $'", async () => {
    const { digestMail, t } = await load();
    const message = digestMail(TO, input(`منشأة\r\nBcc: evil@example.com $& $'`));
    expect(message.subject).toBe(t.digestMail.subject.replace("{establishment}", () => "منشأة Bcc: evil@example.com $& $'"));
    expect(message.subject).not.toMatch(/[\r\n]/);
    expect(message.text).toContain(HOSTILE);
    expect(message.text).toContain("منشأة Bcc: evil@example.com $& $'");
    expect(message.text).not.toContain("{establishment}");
  });

  it("fill replaces every placeholder, and never expands $ patterns in the value", async () => {
    const { fill } = await load();
    expect(fill("{e} — {e}", "e", "$& $' $$ $`")).toBe("$& $' $$ $` — $& $' $$ $`");
  });

  it("no placeholder brace survives in any part, whatever the name", async () => {
    const { digestMail } = await load();
    const message = digestMail(TO, input("منشأة {establishment} $&"));
    for (const part of [message.subject, message.text]) expect(part.replace("{establishment}", "")).not.toMatch(/[{}]/);
    expect(message.html.match(/\{establishment\}/g)).toHaveLength(1);
  });

  it("a CR/LF in a party name or plan title cannot start a line of the text part", async () => {
    const { digestMail } = await load();
    const hostile = input();
    const CRLF = String.fromCharCode(13, 10);
    const LF = String.fromCharCode(10);
    hostile.groups.overdue.rows = [row(`عميل${CRLF}Bcc: a@example.com`, `عقد${LF}Fake: line`, "IN", 100)];
    const { text } = digestMail(TO, hostile);
    expect(text).not.toMatch(new RegExp(`${LF}(?:Bcc|Fake):`));
    expect(text).toContain("عميل Bcc: a@example.com");
    expect(text).toContain("عقد Fake: line");
  });

  it("is Arabic, right to left, lists only non-empty groups in order, with Western-digit totals", async () => {
    const { digestMail, t } = await load();
    const { html, text } = digestMail(TO, input());
    expect(html).toContain('<html dir="rtl" lang="ar">');
    expect(html).toContain(t.digestMail.overdue);
    expect(html).toContain(t.digestMail.tomorrow);
    expect(html).not.toContain(t.digestMail.today);
    expect(html).not.toContain(t.digestMail.upcoming);
    expect(html.indexOf(t.digestMail.overdue)).toBeLessThan(html.indexOf(t.digestMail.tomorrow));
    expect(html).toContain("1,234.56 ر.س");
    expect(html).toContain(`${t.digestMail.toUs} 9,999.00 ر.س`);
    expect(html).toContain("و3 أخرى");
    expect(text).toContain("و3 أخرى");
    expect(html).not.toMatch(/[٠-٩]/);
    expect(text).not.toMatch(/[٠-٩]/);
    expect(html).toContain(t.digestMail.footer);
  });

  it("links to the dues page on APP_URL, and omits the link when APP_URL is unset or not http(s)", async () => {
    let { digestMail, t } = await load();
    expect(digestMail(TO, input()).html).toContain('href="https://ledger.example.com/owner/dues"');
    expect(digestMail(TO, input()).text).toContain("https://ledger.example.com/owner/dues");
    for (const value of ["", "javascript:alert(1)"]) {
      vi.stubEnv("APP_URL", value);
      vi.resetModules();
      ({ digestMail, t } = await load());
      const message = digestMail(TO, input());
      expect(message.html).not.toContain("href=");
      expect(message.html).not.toContain(t.digestMail.openDues);
      expect(message.text).not.toContain(t.digestMail.openDues);
      expect(message.html).not.toContain("javascript:");
    }
  });

  it("the auth mails still carry no owner text (A13 unchanged)", async () => {
    const source = readFileSync("src/lib/mail/templates.ts", "utf8");
    const auth = source.slice(0, source.indexOf("v1.2c digest */"));
    expect(auth).not.toMatch(/escapeHtml\(|plainLine\(/);
    expect(auth.length).toBeGreaterThan(1000);
  });
});

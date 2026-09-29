import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryDb, type MemoryDb } from "./testing/memoryDb";

/**
 * The code state machine (docs/BACKEND.md v1.1e "Codes" + A4, A5), against an
 * in-memory stand-in for the EmailCode table. The fake-flow twin (A1) is
 * driven end to end through the actions in `features/auth/verify.test.ts`.
 */

const h = vi.hoisted(() => ({ db: null as unknown as MemoryDb }));

vi.mock("server-only", () => ({}));
vi.mock("./db", () => ({
  get db() {
    return h.db;
  },
}));

process.env.SESSION_SECRET = "s".repeat(40);

const codes = await import("./codes");
const {
  checkCode,
  codesMatch,
  consumeCode,
  generateCode,
  hashCode,
  issueCode,
  resendWaitSeconds,
  MAX_CODE_ATTEMPTS,
} = codes;

const T0 = new Date("2026-09-30T09:00:00Z");
const U = { userId: "user_1", purpose: "VERIFY" as const };

function at(ms: number): Date {
  return new Date(T0.getTime() + ms);
}

async function issued(now = T0): Promise<string> {
  const result = await issueCode(U, now);
  if (result.status !== "issued") throw new Error(`expected a code, got ${result.status}`);
  return result.code;
}

function wrong(code: string): string {
  return code === "000000" ? "111111" : "000000";
}

beforeEach(() => {
  h.db = createMemoryDb();
  codes.resetFakeFlows();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("storage", () => {
  it("generates six digits, zero-padded", () => {
    for (let i = 0; i < 200; i += 1) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it("never stores the code: only an HMAC bound to the user and purpose", async () => {
    const code = await issued();
    const row = h.db.data.emailCode[0]!;
    expect(row.codeHash).not.toContain(code);
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Object.values(row)).not.toContain(code);
    expect(hashCode("user_2", "VERIFY", code)).not.toBe(row.codeHash);
    expect(hashCode("user_1", "RESET", code)).not.toBe(row.codeHash);
  });

  it("compares equal-length buffers and refuses a malformed stored hash", () => {
    const good = hashCode("u", "VERIFY", "123456");
    expect(codesMatch(good, "u", "VERIFY", "123456")).toBe(true);
    expect(codesMatch(good, "u", "VERIFY", "123457")).toBe(false);
    expect(codesMatch("abcd", "u", "VERIFY", "123456")).toBe(false);
  });

  it("is keyed off SESSION_SECRET: rotating the secret voids the code", async () => {
    vi.resetModules();
    const before = hashCode("u", "VERIFY", "123456");
    process.env.SESSION_SECRET = "t".repeat(40);
    const fresh = await import("./codes");
    expect(fresh.hashCode("u", "VERIFY", "123456")).not.toBe(before);
    process.env.SESSION_SECRET = "s".repeat(40);
  });
});

describe("checkCode", () => {
  it("accepts the right code without consuming it (the caller does, in its transaction)", async () => {
    const code = await issued();
    const result = await checkCode(U, code, at(1000));
    expect(result.ok).toBe(true);
    expect(h.db.data.emailCode[0]!.consumedAt).toBeNull();
  });

  it("a wrong code is codeInvalid until the fifth, which burns it", async () => {
    const code = await issued();
    const answers = [];
    for (let i = 0; i < MAX_CODE_ATTEMPTS; i += 1) {
      const r = await checkCode(U, wrong(code), at(1000));
      answers.push(r.ok ? "ok" : r.error);
    }
    expect(answers).toEqual([
      "err.codeInvalid",
      "err.codeInvalid",
      "err.codeInvalid",
      "err.codeInvalid",
      "err.codeAttempts",
    ]);
    // Burnt: even the right code is refused now.
    expect(await checkCode(U, code, at(2000))).toEqual({ ok: false, error: "err.codeAttempts" });
  });

  it("expires after 10 minutes", async () => {
    const code = await issued();
    expect((await checkCode(U, code, at(10 * 60_000 - 1))).ok).toBe(true);
    expect(await checkCode(U, code, at(10 * 60_000))).toEqual({ ok: false, error: "err.codeExpired" });
  });

  it("with no code at all, answers codeExpired — what a lapsed real code answers (A1, restart)", async () => {
    expect(await checkCode(U, "123456", T0)).toEqual({ ok: false, error: "err.codeExpired" });
  });

  it("with no code, the resend wait counts from when the flow started", async () => {
    expect(await resendWaitSeconds(U, T0.getTime(), at(20_000))).toBe(40);
    expect(await resendWaitSeconds(U, T0.getTime(), at(60_000))).toBe(0);
  });

  it("increments before comparing: ten parallel guesses spend at most five attempts (A5)", async () => {
    const code = await issued();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => checkCode(U, wrong(code), at(1000))),
    );
    expect(h.db.data.emailCode[0]!.attempts).toBe(MAX_CODE_ATTEMPTS);
    // Only a guess that won an attempt was compared at all; the rest were refused unread.
    const compared = results.filter((r) => !r.ok && r.error === "err.codeInvalid").length;
    expect(compared).toBe(MAX_CODE_ATTEMPTS);
    expect(results.filter((r) => !r.ok && r.error === "err.codeAttempts")).toHaveLength(5);
  });

  it("runs the same three statements whatever the outcome (equal query count)", async () => {
    const code = await issued();
    const count = async (submitted: string, when: Date, subject = U) => {
      h.db.log.length = 0;
      await checkCode(subject, submitted, when);
      return [...h.db.log];
    };
    const right = await count(code, at(1000));
    const bad = await count(wrong(code), at(1000));
    const expired = await count(code, at(11 * 60_000));
    const none = await count(code, at(1000), { userId: "nobody", purpose: "VERIFY" });
    expect(right).toEqual(["emailCode.findFirst", "emailCode.aggregate", "emailCode.updateMany"]);
    for (const log of [bad, expired, none]) expect(log).toEqual(right);
  });
});

describe("consumeCode", () => {
  it("consumes exactly once", async () => {
    const code = await issued();
    const check = await checkCode(U, code, at(1000));
    if (!check.ok) throw new Error("expected ok");
    expect(await consumeCode(h.db as never, check.codeId, at(1000))).toBe(true);
    expect(await consumeCode(h.db as never, check.codeId, at(1001))).toBe(false);
    // A consumed code is gone: the flow now has no live code at all.
    expect(await checkCode(U, code, at(1002))).toEqual({ ok: false, error: "err.codeExpired" });
  });
});

describe("issueCode and resends", () => {
  it("refuses a resend inside 60 s and allows it after", async () => {
    await issued();
    expect(await issueCode(U, at(59_999))).toEqual({ status: "tooSoon" });
    expect(await resendWaitSeconds(U, T0.getTime(), at(30_000))).toBe(30);
    expect((await issueCode(U, at(60_000))).status).toBe("issued");
  });

  it("keeps at most one live code: a resend retires the old one", async () => {
    const first = await issued();
    const second = await issued(at(61_000));
    const live = h.db.data.emailCode.filter((r) => r.consumedAt === null);
    expect(live).toHaveLength(1);
    expect(await checkCode(U, first, at(62_000))).not.toMatchObject({ ok: true });
    expect((await checkCode(U, second, at(62_000))).ok).toBe(true);
  });

  it("a resend gives five fresh attempts", async () => {
    const first = await issued();
    for (let i = 0; i < 5; i += 1) await checkCode(U, wrong(first), at(1000));
    const second = await issued(at(61_000));
    expect((await checkCode(U, second, at(62_000))).ok).toBe(true);
  });

  it("RESET has its own codes and the same 60 s gate", async () => {
    const R = { userId: "user_1", purpose: "RESET" as const };
    await issued();
    expect((await issueCode(R, at(1000))).status).toBe("issued");
    expect(await issueCode(R, at(2000))).toEqual({ status: "tooSoon" });
  });
});

describe("caps across codes, rolling 24 h (A4)", () => {
  it("issues at most five codes, then nothing", async () => {
    for (let i = 0; i < 5; i += 1) expect((await issueCode(U, at(i * 61_000))).status).toBe("issued");
    expect(await issueCode(U, at(5 * 61_000))).toEqual({ status: "capped" });
    // …until the first one is more than a day old.
    expect((await issueCode(U, at(24 * 3_600_000 + 1))).status).toBe("issued");
  });

  it("burns every code once the summed attempts reach ten, although no single code used five", async () => {
    const first = await issued();
    for (let i = 0; i < 4; i += 1) await checkCode(U, wrong(first), at(1000));
    const second = await issued(at(61_000));
    for (let i = 0; i < 4; i += 1) await checkCode(U, wrong(second), at(62_000));
    const third = await issued(at(122_000));
    expect(await checkCode(U, wrong(third), at(123_000))).toEqual({ ok: false, error: "err.codeInvalid" });
    // The tenth attempt of the day: this code has used only two.
    expect(await checkCode(U, wrong(third), at(124_000))).toEqual({ ok: false, error: "err.codeAttempts" });
    expect(h.db.data.emailCode.at(-1)!.attempts).toBe(2);
    // Burnt for the right code too, and no fourth code is issued.
    expect(await checkCode(U, third, at(125_000))).toEqual({ ok: false, error: "err.codeAttempts" });
    expect(await issueCode(U, at(190_000))).toEqual({ status: "capped" });
  });
});

describe("the fake flow twin, at the code level (A1)", () => {
  it("is VERIFY-only: a RESET code for an id marked fake still goes to the database (E3-B1)", async () => {
    codes.startFakeFlow("user_1");
    const reset = { userId: "user_1", purpose: "RESET" as const };
    const result = await issueCode(reset, T0);
    expect(result.status).toBe("issued");
    expect(h.db.data.emailCode.map((c) => c.purpose)).toEqual(["RESET"]);
    if (result.status === "issued") expect((await checkCode(reset, result.code, at(1000))).ok).toBe(true);
  });

  it("runs the same statements as a real flow and never succeeds", async () => {
    codes.startFakeFlow("flow_fake");
    const F = { userId: "flow_fake", purpose: "VERIFY" as const };

    h.db.log.length = 0;
    await issueCode(U, T0);
    const realIssue = [...h.db.log];
    h.db.log.length = 0;
    await issueCode(F, T0);
    // The insert is the one statement the fake cannot run (no user to reference);
    // issuing only ever happens after the response.
    expect([...h.db.log, "emailCode.create"]).toEqual(realIssue);
    expect(h.db.data.emailCode).toHaveLength(1);

    h.db.log.length = 0;
    const real = await checkCode(U, "000000", at(1000));
    const realLog = [...h.db.log];
    h.db.log.length = 0;
    const fake = await checkCode(F, "000000", at(1000));
    expect(h.db.log).toEqual(realLog);
    // "000000" is almost surely wrong for both; the answers match either way.
    expect(fake.ok).toBe(false);
    expect(real.ok ? "err.codeInvalid" : real.error).toBe(fake.ok ? "" : fake.error);
  });
});

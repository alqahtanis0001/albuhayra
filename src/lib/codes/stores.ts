import "server-only";
import { randomUUID } from "node:crypto";

import { db } from "../db";
import { DAY_MS, MAX_CODE_ATTEMPTS, type CodeSubject } from "./constants";

/**
 * Where codes live: the EmailCode table for a real flow, an in-memory map for
 * a fake one (A1). Both expose the same five operations, and the fake runs the
 * real store's statements first (they match zero rows), so the state machine
 * in `index.ts` — the only caller — cannot tell them apart, and neither can a
 * stopwatch.
 */

type CodeRow = { id: string; codeHash: string; sentAt: Date; expiresAt: Date; attempts: number };
type Stats = { issued: number; attempts: number };

export type CodeStore = {
  /** The newest unconsumed code — only ever the newest (A5). */
  newest(): Promise<CodeRow | null>;
  stats(since: Date): Promise<Stats>;
  /** Consume every live code: a resend leaves at most one. */
  retire(now: Date): Promise<void>;
  insert(row: Omit<CodeRow, "id" | "attempts">): Promise<void>;
  /** Increment first, compare second (A5): false when burnt, expired or consumed. */
  spendAttempt(id: string, now: Date): Promise<boolean>;
};

function dbStore({ userId, purpose }: CodeSubject): CodeStore {
  return {
    newest: () =>
      db.emailCode.findFirst({
        where: { userId, purpose, consumedAt: null },
        orderBy: { sentAt: "desc" },
        select: { id: true, codeHash: true, sentAt: true, expiresAt: true, attempts: true },
      }),
    stats: async (since) => {
      const agg = await db.emailCode.aggregate({
        where: { userId, purpose, sentAt: { gt: since } },
        _count: { _all: true },
        _sum: { attempts: true },
      });
      return { issued: agg._count._all, attempts: agg._sum.attempts ?? 0 };
    },
    retire: async (now) => {
      await db.emailCode.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: now },
      });
    },
    insert: async (row) => {
      await db.emailCode.create({ data: { userId, purpose, ...row } });
    },
    spendAttempt: async (id, now) => {
      const { count } = await db.emailCode.updateMany({
        where: { id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: MAX_CODE_ATTEMPTS } },
        data: { attempts: { increment: 1 } },
      });
      return count === 1;
    },
  };
}

type FakeRow = CodeRow & { consumedAt: Date | null };
type FakeFlow = { rows: FakeRow[]; seenAt: number };

const fakeFlows = new Map<string, FakeFlow>();

function sweepFakes(now: number): void {
  if (fakeFlows.size < 5_000) return;
  for (const [id, flow] of fakeFlows) if (flow.seenAt + DAY_MS < now) fakeFlows.delete(id);
}

/** Registers `flowId` as a fake flow. Idempotent. */
export function startFakeFlow(flowId: string): void {
  sweepFakes(Date.now());
  if (!fakeFlows.has(flowId)) fakeFlows.set(flowId, { rows: [], seenAt: Date.now() });
}

export function isFakeFlow(flowId: string): boolean {
  return fakeFlows.has(flowId);
}

/** The same statements as dbStore (matching zero rows), then the map. */
function fakeStore(subject: CodeSubject, flow: FakeFlow): CodeStore {
  const real = dbStore(subject);
  const live = () => flow.rows.filter((row) => row.consumedAt === null);
  return {
    newest: async () => {
      await real.newest();
      flow.seenAt = Date.now();
      const newest = live().sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())[0];
      // A copy, as the database returns: the state machine reads `attempts`
      // after spending one, and must see the value from before the spend.
      return newest ? { ...newest } : null;
    },
    stats: async (since) => {
      await real.stats(since);
      const recent = flow.rows.filter((row) => row.sentAt > since);
      return { issued: recent.length, attempts: recent.reduce((sum, row) => sum + row.attempts, 0) };
    },
    retire: async (now) => {
      await real.retire(now);
      for (const row of live()) row.consumedAt = now;
    },
    // No insert statement: the fake has no user row to reference. Inserts only
    // ever run inside after(), where they cannot time the response.
    insert: async (row) => {
      flow.rows.push({ ...row, id: `fake_${randomUUID()}`, attempts: 0, consumedAt: null });
    },
    spendAttempt: async (id, now) => {
      await real.spendAttempt(id, now);
      const row = flow.rows.find((r) => r.id === id);
      if (!row || row.consumedAt || row.expiresAt <= now || row.attempts >= MAX_CODE_ATTEMPTS) {
        return false;
      }
      row.attempts += 1;
      return true;
    },
  };
}

/**
 * Fake flows exist only for VERIFY (a sign-up with a registered address).
 * RESET always uses the database, so even an id wrongly marked fake can never
 * swallow a real user's reset codes (R-E3 E3-B1, defence in depth).
 */
export function storeFor(subject: CodeSubject): CodeStore {
  const flow = subject.purpose === "VERIFY" ? fakeFlows.get(subject.userId) : undefined;
  return flow ? fakeStore(subject, flow) : dbStore(subject);
}

/** Test-only helper. */
export function resetFakeFlows(): void {
  fakeFlows.clear();
}

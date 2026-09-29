/**
 * TEST-ONLY. A small in-memory stand-in for the parts of the Prisma client the
 * v1.1e auth code uses: `user`, `establishment`, `emailCode`, `auditLog` and
 * `$transaction` (with rollback). Imported only by `*.test.ts`; nothing in the
 * app imports it, so it never reaches a bundle.
 *
 * It records every statement as `model.method` in `log`, which is how the
 * tests assert that two paths run the same number of queries.
 *
 * `where` supports what the code under test writes: plain equality (including
 * `null`) and `{ gt }` / `{ lt }` on dates and numbers. `data` supports plain
 * values and `{ increment }`. `select` is ignored — whole rows come back, as
 * copies, like a real client: a later write must not change a row already read.
 */

type Row = Record<string, unknown>;
type Where = Record<string, unknown>;

function matches(row: Row, where: Where = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    const value = row[key];
    if (cond !== null && typeof cond === "object" && !(cond instanceof Date)) {
      const c = cond as { gt?: unknown; lt?: unknown };
      if ("gt" in c && !((value as number) > (c.gt as number))) return false;
      if ("lt" in c && !((value as number) < (c.lt as number))) return false;
      return true;
    }
    if (cond instanceof Date) return value instanceof Date && value.getTime() === cond.getTime();
    return value === cond;
  });
}

function apply(row: Row, data: Row): void {
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && typeof value === "object" && "increment" in (value as Row)) {
      row[key] = (row[key] as number) + ((value as { increment: number }).increment);
    } else {
      row[key] = value;
    }
  }
}

let seq = 0;

function table(name: string, log: string[], rows: Row[], defaults: () => Row) {
  const note = (method: string) => log.push(`${name}.${method}`);
  return {
    rows,
    findUnique: async ({ where }: { where: Where }) => {
      note("findUnique");
      const row = rows.find((r) => matches(r, where));
      return row ? { ...row } : null;
    },
    findUniqueOrThrow: async ({ where }: { where: Where }) => {
      note("findUniqueOrThrow");
      const row = rows.find((r) => matches(r, where));
      if (!row) throw new Error("not found");
      return { ...row };
    },
    findFirst: async ({ where, orderBy }: { where?: Where; orderBy?: Record<string, "asc" | "desc"> }) => {
      note("findFirst");
      let found = rows.filter((r) => matches(r, where));
      if (orderBy) {
        const [key, dir] = Object.entries(orderBy)[0]!;
        found = [...found].sort((a, b) => {
          const d = (a[key] as Date).getTime() - (b[key] as Date).getTime();
          return dir === "desc" ? -d : d;
        });
      }
      return found[0] ? { ...found[0] } : null;
    },
    create: async ({ data }: { data: Row }) => {
      note("create");
      if (name === "user" && rows.some((r) => r.email === data.email)) {
        throw new Error("Unique constraint failed on the fields: (`email`)");
      }
      const row = { ...defaults(), ...data };
      rows.push(row);
      return row;
    },
    updateMany: async ({ where, data }: { where: Where; data: Row }) => {
      note("updateMany");
      const hit = rows.filter((r) => matches(r, where));
      for (const row of hit) apply(row, data);
      return { count: hit.length };
    },
    aggregate: async ({ where }: { where: Where }) => {
      note("aggregate");
      const hit = rows.filter((r) => matches(r, where));
      return {
        _count: { _all: hit.length },
        _sum: { attempts: hit.length ? hit.reduce((s, r) => s + (r.attempts as number), 0) : null },
      };
    },
  };
}

export function createMemoryDb() {
  const log: string[] = [];
  const data = {
    user: [] as Row[],
    establishment: [] as Row[],
    emailCode: [] as Row[],
    auditLog: [] as Row[],
  };
  const id = (prefix: string) => `${prefix}_${++seq}`;
  const db = {
    log,
    data,
    user: table("user", log, data.user, () => ({
      id: id("user"),
      middleName: null,
      legacyName: null,
      emailVerifiedAt: null,
      canEdit: false,
      createdAt: new Date(),
    })),
    establishment: table("establishment", log, data.establishment, () => ({
      id: id("est"),
      active: true,
      createdAt: new Date(),
    })),
    emailCode: table("emailCode", log, data.emailCode, () => ({
      id: id("code"),
      attempts: 0,
      consumedAt: null,
      sentAt: new Date(),
      createdAt: new Date(),
    })),
    auditLog: table("auditLog", log, data.auditLog, () => ({ id: id("audit"), createdAt: new Date() })),
    /** Interactive transactions only; a throw restores every table. */
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      log.push("$transaction");
      const snapshot = Object.fromEntries(
        Object.entries(data).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))]),
      ) as typeof data;
      try {
        return await fn(db);
      } catch (error) {
        for (const key of Object.keys(data) as Array<keyof typeof data>) {
          data[key].splice(0, data[key].length, ...snapshot[key]);
        }
        throw error;
      }
    },
  };
  return db;
}

export type MemoryDb = ReturnType<typeof createMemoryDb>;

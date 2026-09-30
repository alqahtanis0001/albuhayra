/**
 * TEST-ONLY SQL for the digest run on PGlite (`digestRun.test.ts`). Imported
 * by that test alone. Today is 2026-10-05 (Riyadh) throughout.
 *
 *  est1  on, 07:00  — every group, an escaped party name, a salary row
 *  est2  on, 07:00  — another tenant's secret party (tenancy)
 *  est3  off        — never mailed
 *  est4  on, 23:00  — hour gating (and the evening side of midnight)
 *  est5  on, 07:00  — owner not verified → skipped (N9)
 *  est6  inactive   — never mailed
 *  est7  on, 07:00  — nothing due → EMPTY, no mail
 *  est8  on, 07:00  — a salaried employee with no months yet (E4)
 *  est9  on, 00:00  — the morning side of midnight
 *  est10 off        — 53 overdue rows (the 50-row cap)
 */

export const OWNERS: Record<string, string> = {
  est1: "owner1@example.com",
  est2: "owner2@example.com",
  est4: "owner4@example.com",
  est7: "owner7@example.com",
  est8: "owner8@example.com",
  est9: "owner9@example.com",
};

export const HOSTILE_NAME = `<script>alert("x")</script> & 'Co' $& $'`;
export const SECRET_NAME = "سرّي جداً";

const establishment = (id: string, on: boolean, hour: number, active = true) =>
  `INSERT INTO "Establishment" ("id", "name", "joinCode", "active", "digestEnabled", "digestHour")
   VALUES ('${id}', 'منشأة ${id}', 'JC${id.toUpperCase().padEnd(6, "X")}', ${active}, ${on}, ${hour});`;

const owner = (n: string, verified = true) =>
  `INSERT INTO "User" ("id", "email", "passwordHash", "role", "status", "establishmentId", "firstName", "lastName", "emailVerifiedAt")
   VALUES ('u${n}', 'owner${n}@example.com', 'h', 'OWNER', 'ACTIVE', 'est${n}', 'مالك', '${n}', ${verified ? "now()" : "NULL"});`;

const category = (est: string, id: string, name: string, type: "IN" | "OUT") =>
  `INSERT INTO "Category" ("id", "establishmentId", "nameAr", "type") VALUES ('${id}', '${est}', '${name}', '${type}');`;

const party = (est: string, id: string, name: string, type: string) =>
  `INSERT INTO "Party" ("id", "establishmentId", "name", "type", "updatedAt") VALUES ('${id}', '${est}', $n$${name}$n$, '${type}', now());`;

const plan = (est: string, id: string, partyId: string, dir: "IN" | "OUT", cat: string, days: number, extra = "", extraValues = "") =>
  `INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "reminderDays", "updatedAt"${extra})
   VALUES ('${id}', '${est}', '${partyId}', '${dir}', 'اتفاقية ${id}', 100000, '${cat}', '2026-01-01', ${days}, now()${extraValues});`;

const inst = (est: string, id: string, planId: string, seq: number, due: string, amount: number, paid = 0) =>
  `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "paidHalalas", "updatedAt")
   VALUES ('${id}', '${est}', '${planId}', ${seq}, '${due}', ${amount}, ${paid}, now());`;

export const FIXTURES = [
  ...["est1", "est2", "est4", "est5", "est7", "est8", "est9"].map((id) =>
    establishment(id, true, id === "est4" ? 23 : id === "est9" ? 0 : 7),
  ),
  establishment("est3", false, 7),
  establishment("est6", true, 7, false),
  establishment("est10", false, 7),
  ...["1", "2", "3", "4", "6", "7", "8", "9", "10"].map((n) => owner(n)),
  owner("5", false),

  // est1: every group.
  category("est1", "cat1_in", "مبيعات", "IN"),
  category("est1", "cat1_out", "مشتريات", "OUT"),
  category("est1", "cat1_sal", "رواتب", "OUT"),
  party("est1", "pc1", HOSTILE_NAME, "CUSTOMER"),
  party("est1", "ps1", "مورد الشرق", "SUPPLIER"),
  party("est1", "pe1", "أحمد", "EMPLOYEE"),
  `INSERT INTO "Employee" ("id", "establishmentId", "partyId", "startDate", "updatedAt") VALUES ('emp1', 'est1', 'pe1', '2026-01-01', now());`,
  plan("est1", "p_in", "pc1", "IN", "cat1_in", 3),
  plan("est1", "p_out", "ps1", "OUT", "cat1_out", 10),
  plan("est1", "p_arch", "pc1", "IN", "cat1_in", 3, `, "state"`, `, 'ARCHIVED'`),
  plan("est1", "p_sal", "pe1", "OUT", "cat1_sal", 3, `, "kind", "employeeId"`, `, 'SALARY', 'emp1'`),
  inst("est1", "i1", "p_in", 1, "2026-09-20", 10000, 2500), // overdue, 75.00 left
  inst("est1", "i2", "p_in", 2, "2026-10-05", 10000), // today
  inst("est1", "i3", "p_in", 3, "2026-10-06", 10000), // tomorrow (and within 3 days)
  inst("est1", "i4", "p_in", 4, "2026-10-08", 10000), // today + 3 = within the window
  inst("est1", "i5", "p_in", 5, "2026-10-09", 10000), // today + 4 = outside it
  inst("est1", "i6", "p_in", 6, "2026-10-01", 10000, 10000), // paid
  inst("est1", "o1", "p_out", 1, "2026-10-15", 20000), // today + 10 = within its 10 days
  inst("est1", "o2", "p_out", 2, "2026-10-16", 20000), // today + 11
  inst("est1", "a1", "p_arch", 1, "2026-09-01", 50000), // archived plan
  inst("est1", "s1", "p_sal", 1, "2026-09-27", 300000), // salary, overdue

  // est2: another tenant.
  category("est2", "cat2_in", "مبيعات", "IN"),
  party("est2", "pc2", SECRET_NAME, "CUSTOMER"),
  plan("est2", "p2", "pc2", "IN", "cat2_in", 3),
  inst("est2", "x2", "p2", 1, "2026-09-30", 999999),

  // est3, est4, est5, est6, est9: one overdue row each.
  ...["3", "4", "5", "6", "9"].flatMap((n) => [
    category(`est${n}`, `cat${n}`, "مبيعات", "IN"),
    party(`est${n}`, `pc${n}`, `عميل ${n}`, "CUSTOMER"),
    plan(`est${n}`, `p${n}`, `pc${n}`, "IN", `cat${n}`, 3),
    inst(`est${n}`, `x${n}`, `p${n}`, 1, "2026-09-30", 5000),
  ]),

  // est8: salaried from 2026-10-01, paid on the 5th, no months generated yet.
  category("est8", "cat8_sal", "رواتب", "OUT"),
  party("est8", "pe8", "خالد", "EMPLOYEE"),
  `INSERT INTO "Employee" ("id", "establishmentId", "partyId", "startDate", "basicSalaryHalalas", "payDay", "salaryCategoryId", "updatedAt")
   VALUES ('emp8', 'est8', 'pe8', '2026-10-01', 400000, 5, 'cat8_sal', now());`,
  `INSERT INTO "Plan" ("id", "establishmentId", "partyId", "direction", "title", "totalHalalas", "categoryId", "startDate", "kind", "employeeId", "updatedAt")
   VALUES ('p8', 'est8', 'pe8', 'OUT', 'راتب شهري', 0, 'cat8_sal', '2026-10-01', 'SALARY', 'emp8', now());`,

  // est10: 53 overdue rows of 1.00 each.
  category("est10", "cat10", "مبيعات", "IN"),
  party("est10", "pc10", "عميل كبير", "CUSTOMER"),
  plan("est10", "p10", "pc10", "IN", "cat10", 3),
  `INSERT INTO "Instalment" ("id", "establishmentId", "planId", "seq", "dueDate", "amountDueHalalas", "updatedAt")
   SELECT 'x10_' || g, 'est10', 'p10', g, DATE '2026-08-01' + g, 100, now() FROM generate_series(1, 53) g;`,
].join("\n");

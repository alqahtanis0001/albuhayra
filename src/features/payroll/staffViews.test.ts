import { readdirSync, readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

/**
 * S-L5a: `hideSalary` is opt-in, so an omitted flag fails open — a staff page
 * would show colleagues' salaries. This pins it in the source: every ledger
 * read reachable by STAFF passes `hideSalary: true`, and no staff file calls an
 * owner-shaped read at all (spec §3.5). `payroll/privacy.test.ts` proves on real
 * SQL what the flag does; this proves the flag is set. Known gap: calls are
 * matched by name, so an aliased import (`getTransaction as read`) escapes it.
 */

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

/** The argument text of every call to `name(` — balanced parentheses, so nested calls stay inside. */
function callsOf(source: string, name: string): string[] {
  const found: string[] = [];
  for (const match of source.matchAll(new RegExp(`\\b${name}\\(`, "g"))) {
    let depth = 1;
    let i = match.index! + match[0].length;
    const start = i;
    for (; i < source.length && depth > 0; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") depth--;
    }
    found.push(source.slice(start, i - 1));
  }
  return found;
}

const LEDGER_READS = ["listTransactions", "getTransaction", "recentTransactions"];
const HIDES = /\bhideSalary:\s*true\b/;
/** Reads whose shape is the owner's: plan titles, totals, salary rows, profiles. */
const OWNER_READS = /\b(?:getDues|getInstalmentForPayment|listPlans|getPlan|getPartyStatement|listParties|getParty|getEmployee|listEmployees|getPayslip|getOwnerDashboard)\(/;

const STAFF_FILES = walk("src/app/(staff)");

describe("S-L5a: every staff ledger read hides salary rows", () => {
  it("scans real staff files and finds the reads it guards", () => {
    expect(STAFF_FILES.length).toBeGreaterThanOrEqual(4);
    const reads = STAFF_FILES.flatMap((f) => LEDGER_READS.flatMap((n) => callsOf(readFileSync(f, "utf8"), n)));
    expect(reads.length).toBeGreaterThanOrEqual(2);
  });

  it("every listTransactions / getTransaction / recentTransactions call under src/app/(staff) passes hideSalary: true", () => {
    for (const file of STAFF_FILES) {
      const source = readFileSync(file, "utf8");
      for (const name of LEDGER_READS) {
        for (const args of callsOf(source, name)) expect(args, `${file}: ${name}(${args})`).toMatch(HIDES);
      }
    }
  });

  it("getStaffDashboard's recent list passes it too", () => {
    const source = readFileSync("src/features/dashboard/queries.ts", "utf8");
    const body = source.slice(source.indexOf("export async function getStaffDashboard"));
    const recent = callsOf(body, "recentTransactions");
    expect(recent).toHaveLength(1);
    expect(recent[0]).toMatch(HIDES);
  });

  it("no staff file calls an owner-shaped read (dues and prefill have staff variants)", () => {
    for (const file of STAFF_FILES) expect(readFileSync(file, "utf8"), file).not.toMatch(OWNER_READS);
  });

  it("the scanners catch the shapes they forbid", () => {
    const bad = "const a = await listTransactions(est, parse(sp), {});";
    expect(callsOf(bad, "listTransactions")).toEqual(["est, parse(sp), {}"]);
    expect(callsOf(bad, "listTransactions")[0]).not.toMatch(HIDES);
    expect(callsOf("getTransaction(est, id, { hideSalary: true })", "getTransaction")[0]).toMatch(HIDES);
    expect("await getDues(establishmentId)").toMatch(OWNER_READS);
    expect("await getStaffDues(establishmentId)").not.toMatch(OWNER_READS);
    expect("getStaffPaymentPrefill(e, i)").not.toMatch(OWNER_READS);
  });
});

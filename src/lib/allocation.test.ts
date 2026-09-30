import { describe, expect, it } from "vitest";

import { allocate, type AllocInstalment, type AllocPayment } from "./allocation";

/** Three monthly instalments of 1000. */
const ROWS: AllocInstalment[] = [
  { id: "i1", dueDate: "2026-10-01", seq: 1, amountDueHalalas: 1000 },
  { id: "i2", dueDate: "2026-11-01", seq: 2, amountDueHalalas: 1000 },
  { id: "i3", dueDate: "2026-12-01", seq: 3, amountDueHalalas: 1000 },
];

let n = 0;
const pay = (instalmentId: string, amountHalalas: number, date = "2026-10-01", createdAt = "2026-10-01T10:00:00Z"): AllocPayment => ({
  id: `p${++n}`,
  instalmentId,
  date,
  createdAt,
  amountHalalas,
});

describe("allocate", () => {
  it("an exact payment pays its own instalment", () => {
    expect(allocate(ROWS, [pay("i1", 1000)])).toEqual({ paid: { i1: 1000, i2: 0, i3: 0 }, overpaidHalalas: 0 });
  });

  it("a partial payment stays on its own instalment", () => {
    expect(allocate(ROWS, [pay("i2", 400)]).paid).toEqual({ i1: 0, i2: 400, i3: 0 });
  });

  it("an overpayment rolls forward to the later instalments", () => {
    expect(allocate(ROWS, [pay("i1", 2500)]).paid).toEqual({ i1: 1000, i2: 1000, i3: 500 });
  });

  it("past the last instalment it wraps to the earliest still unpaid", () => {
    expect(allocate(ROWS, [pay("i3", 1800)]).paid).toEqual({ i1: 800, i2: 0, i3: 1000 });
  });

  it("a wrap skips instalments already paid", () => {
    const result = allocate(ROWS, [pay("i1", 1000, "2026-10-01"), pay("i3", 1700, "2026-10-02")]);
    expect(result.paid).toEqual({ i1: 1000, i2: 700, i3: 1000 });
  });

  it("whatever is left after every instalment is overpaid residue", () => {
    expect(allocate(ROWS, [pay("i2", 3200)])).toEqual({ paid: { i1: 1000, i2: 1000, i3: 1000 }, overpaidHalalas: 200 });
  });

  /**
   * Found while writing this: the per-instalment totals do not depend on the
   * payment order at all. Each payment fills a circular run from its own
   * instalment, and like cars parking on a one-way ring, the final occupancy is
   * the same in every order (brute-forced over 3 payments × 3 unequal
   * instalments, and pinned here over every permutation). The (date, createdAt,
   * id) sort therefore buys determinism of the iteration, not a different
   * answer — and no test can observe it, so none pretends to.
   */
  it("the result is the same in every payment order", () => {
    const rows: AllocInstalment[] = [
      { id: "a", dueDate: "2026-10-01", seq: 1, amountDueHalalas: 500 },
      { id: "b", dueDate: "2026-11-01", seq: 2, amountDueHalalas: 1000 },
      { id: "c", dueDate: "2026-12-01", seq: 3, amountDueHalalas: 300 },
    ];
    // Below capacity on purpose: when every row ends up full, any rule fills
    // them all and the case could not tell an order-dependent one apart.
    const payments = [pay("c", 200), pay("b", 300), pay("a", 400)];
    const permutations = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    // Re-key the *processing* order (S-P1a): one date, createdAt assigned in the
    // permuted order, so allocate's own sort really processes them differently.
    // Permuting the input array alone would be undone by that sort.
    const results = permutations.map((order) =>
      allocate(
        rows,
        order.map((i, k) => ({ ...payments[i]!, date: "2026-10-01", createdAt: `2026-10-01T0${k}:00:00Z` })),
      ),
    );
    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]).toEqual({ paid: { a: 400, b: 300, c: 200 }, overpaidHalalas: 0 });
  });

  it("orders instalments by (dueDate, seq), not by input order — rolling forward means later", () => {
    // Given i2 first, an unsorted walk would roll i2's excess back into i1.
    const shuffled = [ROWS[1]!, ROWS[0]!, ROWS[2]!];
    expect(allocate(shuffled, [pay("i2", 1500)]).paid).toEqual({ i1: 0, i2: 1000, i3: 500 });
    // Same due date: seq decides (y, x, z), not the id (x, y, z).
    const sameDay: AllocInstalment[] = [
      { id: "x", dueDate: "2026-10-01", seq: 2, amountDueHalalas: 100 },
      { id: "y", dueDate: "2026-10-01", seq: 1, amountDueHalalas: 100 },
      { id: "z", dueDate: "2026-10-01", seq: 3, amountDueHalalas: 100 },
    ];
    expect(allocate(sameDay, [pay("x", 150)]).paid).toEqual({ x: 100, y: 0, z: 50 });
  });

  it("is deterministic: the same rows in any order give the same result", () => {
    const payments = [pay("i1", 700), pay("i3", 900, "2026-10-02"), pay("i2", 1100, "2026-10-02", "2026-10-02T11:00:00Z")];
    const a = allocate(ROWS, payments);
    const b = allocate([...ROWS].reverse(), [...payments].reverse());
    expect(a).toEqual(b);
    expect(Object.values(a.paid).reduce((s, v) => s + v, 0) + a.overpaidHalalas).toBe(2700);
  });

  it("no payments pays nothing; no instalments is all residue", () => {
    expect(allocate(ROWS, [])).toEqual({ paid: { i1: 0, i2: 0, i3: 0 }, overpaidHalalas: 0 });
    expect(allocate([], [pay("i1", 50)])).toEqual({ paid: {}, overpaidHalalas: 50 });
  });
});

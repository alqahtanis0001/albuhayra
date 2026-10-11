import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { DueRow, Dues } from "@/features/plans/dues";
import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R1, R16): the owner test's dead end — a
 * cash payment with no agreement landed on an empty «المستحقات». The empty
 * week now says what belongs here and links to the entry form and to الجهات;
 * with rows the links are absent. The subtitle sits under the h1 either way.
 * The page is rendered by calling its async default export with mocked reads.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async () => undefined }));

let current: Dues;
vi.mock("@/features/plans/dues", () => ({ getDues: async () => current }));

const { default: DuesPage } = await import("./page");

const row: DueRow = {
  instalmentId: "inst_1",
  planId: "plan_1",
  planTitle: "اتفاقية مع محمد",
  partyId: "party_1",
  partyName: "محمد",
  direction: "IN",
  seq: 1,
  dueDate: "2026-10-12",
  remainingHalalas: 400000,
  status: "DUE",
  dayOffset: 2,
  kind: "STANDARD",
  periodYm: null,
  partyRemindersOptIn: false,
  partyHasEmail: false,
};

function dues(thisWeek: DueRow[]): Dues {
  return {
    today: "2026-10-10",
    weekEnd: "2026-10-16",
    overdue: [],
    thisWeek,
    totals: { overdueInHalalas: 0, overdueOutHalalas: 0, weekInHalalas: 400000, weekOutHalalas: 0 },
    hasPlans: true,
  };
}

const CASH = /<a [^>]*href="\/owner\/transactions\/new"/;
const PARTIES = /<a [^>]*href="\/owner\/parties"/;

describe("/owner/dues (R1, R16)", () => {
  it("empty week: the intro sentence and both links, 44 px, inside the week card; the subtitle under the h1", async () => {
    current = dues([]);
    const out = renderToStaticMarkup(await DuesPage());
    expect(out).toContain(t.dues.empty);
    expect(out).toContain(t.dues.emptyIntro);
    expect(out).toContain(t.dues.cashLink);
    expect(out).toContain(t.dues.partiesLink);
    const cash = out.match(CASH)?.[0] ?? "";
    const parties = out.match(PARTIES)?.[0] ?? "";
    expect(cash).toContain("min-h-11");
    expect(parties).toContain("min-h-11");
    // Order on the page: title, subtitle, …, the week card holding the links.
    expect(out.indexOf("<h1")).toBeLessThan(out.indexOf(t.dues.subtitle));
    expect(out.indexOf(t.dues.subtitle)).toBeLessThan(out.indexOf(t.dues.pickOther));
    expect(out.indexOf('id="dues-week"')).toBeLessThan(out.indexOf(t.dues.cashLink));
    // The overdue card's empty text is unchanged.
    expect(out).toContain(t.dues.noOverdue);
  });

  it("with rows this week: no intro, neither link; the subtitle stays", async () => {
    current = dues([row]);
    const out = renderToStaticMarkup(await DuesPage());
    expect(out).toContain("محمد");
    expect(out).not.toContain(t.dues.emptyIntro);
    expect(out).not.toContain(t.dues.cashLink);
    expect(out).not.toContain(t.dues.partiesLink);
    expect(out).not.toMatch(CASH);
    expect(out).not.toMatch(PARTIES);
    expect(out).toContain(t.dues.subtitle);
  });
});

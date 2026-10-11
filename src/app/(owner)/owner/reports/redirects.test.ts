import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * v1.5 (docs/V15-SPEC.md B2, D14, D24): /owner/reports and /owner/reports/aging
 * are server redirects into السجل › التقارير, keeping the query. Observed as in
 * projects/(list)/page.test.ts: `redirect()` throws, carrying the destination.
 */
const calls = vi.hoisted(() => ({ requireOwner: 0 }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT ${to}`), { destination: to });
  },
}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => {
    calls.requireOwner += 1;
    return { user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" };
  },
}));

const { default: ReportsRedirectPage } = await import("./(summary)/page");
const { default: AgingRedirectPage } = await import("./aging/page");

type Page = (props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) => Promise<unknown>;

async function destinationOf(page: Page, params: Record<string, string | string[] | undefined>): Promise<string> {
  try {
    await page({ searchParams: Promise.resolve(params) });
  } catch (error) {
    return (error as { destination: string }).destination;
  }
  throw new Error("the page rendered instead of redirecting");
}

describe("the old report URLs redirect into the reports tab", () => {
  beforeEach(() => {
    calls.requireOwner = 0;
  });

  it("/owner/reports → the category report, after requireOwner()", async () => {
    expect(await destinationOf(ReportsRedirectPage, {})).toBe("/owner/transactions?tab=reports");
    expect(calls.requireOwner).toBe(1);
  });

  it("/owner/reports keeps its query (month, range, party)", async () => {
    expect(await destinationOf(ReportsRedirectPage, { month: "2026-10", partyId: "party_1" })).toBe(
      "/owner/transactions?tab=reports&month=2026-10&partyId=party_1",
    );
    expect(await destinationOf(ReportsRedirectPage, { tab: "activities", from: "2026-10-01", to: "2026-10-31" })).toBe(
      "/owner/transactions?tab=reports&from=2026-10-01&to=2026-10-31",
    );
  });

  it("/owner/reports/aging → the aging sub-tab, query kept, after requireOwner()", async () => {
    expect(await destinationOf(AgingRedirectPage, {})).toBe("/owner/transactions?tab=reports&report=aging");
    expect(await destinationOf(AgingRedirectPage, { from: "2026-10-01" })).toBe(
      "/owner/transactions?tab=reports&report=aging&from=2026-10-01",
    );
    expect(calls.requireOwner).toBe(2);
  });

  it("a redirect-only page has no loading.tsx (it must answer 307, not stream)", () => {
    const dir = "src/app/(owner)/owner/reports";
    expect(existsSync(`${dir}/(summary)/page.tsx`)).toBe(true);
    expect(existsSync(`${dir}/(summary)/loading.tsx`)).toBe(false);
    expect(existsSync(`${dir}/aging/loading.tsx`)).toBe(false);
  });
});

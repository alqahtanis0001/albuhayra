import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 (docs/V14-SPEC.md D29 R16): «عقد؟» — the list title carries one
 * line saying what an agreement is here. In pick mode the banner is unchanged
 * and the subtitle still sits under the h1, never inside the banner.
 */
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/payroll/generate", () => ({ ensureSalaryInstalments: async () => undefined }));
vi.mock("@/features/parties/queries", () => ({ listPartyOptions: async () => [] }));
vi.mock("@/features/plans/queries", () => ({ listPlans: async () => [] }));

const { default: PlansPage } = await import("./page");

const render = async (sp: Record<string, string>) =>
  renderToStaticMarkup(await PlansPage({ searchParams: Promise.resolve(sp) }));

describe("/owner/plans (R16)", () => {
  it("the subtitle sits under the h1, before the filters", async () => {
    const out = await render({});
    expect(out).toContain(t.plans.title);
    expect(out).toContain(t.plans.subtitle);
    expect(out.indexOf("<h1")).toBeLessThan(out.indexOf(t.plans.subtitle));
    expect(out.indexOf(t.plans.subtitle)).toBeLessThan(out.indexOf("<form"));
    expect(out).not.toContain(t.openPlan.pickBanner);
  });

  it("pick mode keeps its banner as is, after the subtitle", async () => {
    const out = await render({ pick: "payment" });
    expect(out).toContain(t.openPlan.pickBanner);
    expect(out).toContain(t.plans.subtitle);
    expect(out.indexOf(t.plans.subtitle)).toBeLessThan(out.indexOf(t.openPlan.pickBanner));
    const banner = out.match(/<p role="status"[^>]*>[^<]*<\/p>/)?.[0] ?? "";
    expect(banner).toContain(t.openPlan.pickBanner);
    expect(banner).not.toContain(t.plans.subtitle);
  });
});

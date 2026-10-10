import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * v1.4 B3/B5: /owner/projects is a server redirect to the «الأنشطة» tab of
 * السجل, carrying `status` only when the list would accept it (A4). The
 * redirect is observed the way src/lib/auth.test.ts does: `redirect()`
 * navigates by throwing, and the thrown error carries the destination.
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

const { default: ProjectsRedirectPage } = await import("./page");

async function destinationOf(params: Record<string, string | string[] | undefined>): Promise<string> {
  try {
    await ProjectsRedirectPage({ searchParams: Promise.resolve(params) });
  } catch (error) {
    return (error as { destination: string }).destination;
  }
  throw new Error("the page rendered instead of redirecting");
}

describe("/owner/projects redirects to the activities tab", () => {
  beforeEach(() => {
    calls.requireOwner = 0;
  });

  it("sends a plain visit to /owner/transactions?tab=activities, after requireOwner()", async () => {
    expect(await destinationOf({})).toBe("/owner/transactions?tab=activities");
    expect(calls.requireOwner).toBe(1);
  });

  it("carries a status the list accepts", async () => {
    expect(await destinationOf({ status: "COMPLETED" })).toBe("/owner/transactions?tab=activities&status=COMPLETED");
    expect(await destinationOf({ status: "ACTIVE" })).toBe("/owner/transactions?tab=activities&status=ACTIVE");
  });

  it("drops anything else", async () => {
    expect(await destinationOf({ status: "evil" })).toBe("/owner/transactions?tab=activities");
    expect(await destinationOf({ status: ["ACTIVE", "COMPLETED"] })).toBe("/owner/transactions?tab=activities");
    expect(await destinationOf({ status: "" })).toBe("/owner/transactions?tab=activities");
    expect(await destinationOf({ tab: "x", q: "y" })).toBe("/owner/transactions?tab=activities");
  });
});

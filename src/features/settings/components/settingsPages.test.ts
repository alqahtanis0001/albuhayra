import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

/**
 * v1.4 A5 (the categories page keeps everything, gains a back link and a hint;
 * `/owner/settings` no longer lands on it — D11), D17 c4 (lock links, owner
 * only; the locks page's way back to the ledger) and c19 (a confirm on
 * «إلغاء الإقفال» only). Pages are rendered by calling their async default
 * export with mocked auth and reads, then `renderToStaticMarkup`.
 */

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));
vi.mock("@/lib/auth", () => ({
  requireOwner: async () => ({ user: { id: "owner_1", role: "OWNER" }, establishmentId: "est_1" }),
}));
vi.mock("@/features/settings/queries", () => ({
  listCategories: async () => [
    { id: "in_a", nameAr: "مبيعات", type: "IN", active: true, sortOrder: 1 },
    { id: "out_a", nameAr: "إيجار", type: "OUT", active: true, sortOrder: 1 },
    { id: "out_b", nameAr: "قديم", type: "OUT", active: false, sortOrder: 2 },
  ],
}));
vi.mock("@/features/settings/actions", () => ({
  createCategory: async () => ({ ok: true, data: null }),
  updateCategory: async () => ({ ok: true, data: null }),
  setCategoryActive: async () => ({ ok: true, data: null }),
  setCategoryOrder: async () => ({ ok: true, data: null }),
}));
vi.mock("@/features/locks/queries", () => ({
  listLocks: async () => [
    { year: 2026, month: 9, ym: "2026-09", locked: true, lockedAt: "2026-10-01", lockedByName: "مالك", lockable: true },
    { year: 2026, month: 8, ym: "2026-08", locked: false, lockedAt: null, lockedByName: null, lockable: true },
  ],
}));
vi.mock("@/features/locks/actions", () => ({
  lockMonth: async () => ({ ok: true, data: null }),
  unlockMonth: async () => ({ ok: true, data: null }),
}));

const { default: CategoriesSettingsPage } = await import("@/app/(owner)/owner/settings/categories/page");
const { default: LocksSettingsPage } = await import("@/app/(owner)/owner/settings/locks/page");
const { settingsRedirectPath } = await import("./settingsPaths");
const { LockCell, dialogText, pressTarget } = await import("./LockCell");
const { LockBadge } = await import("@/components/LockBadge");
const { LockedNotice } = await import("@/features/transactions/components/LockedNotice");

const html = (element: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(element);

describe("A5 — /owner/settings/categories keeps every function and gains the way back", () => {
  it("renders both direction groups, the add forms, the back link and the hint", async () => {
    const out = html(await CategoriesSettingsPage());
    expect(out).toContain(t.settings.categoriesIn);
    expect(out).toContain(t.settings.categoriesOut);
    expect(out).toContain("مبيعات");
    expect(out).toContain(`قديم (${t.status.DISABLED})`);
    expect(out.match(/<form/g)?.length).toBeGreaterThanOrEqual(3); // rename ×3 + add ×2
    expect(out).toContain(t.settings.renameCategory);
    expect(out).toContain(t.common.moveUp);
    expect(out).toContain(t.common.disable);
    expect(out).toContain(t.common.enable);
    expect(out).toContain(`href="/owner/settings"`);
    expect(out).toContain(t.categoriesPage.back);
    expect(out).toContain(t.categoriesPage.hint);
  });

  it("D11: /owner/settings no longer lands on categories; ?tab=categories still does", () => {
    expect(settingsRedirectPath(undefined)).toBe("/owner/settings/join-code");
    expect(settingsRedirectPath("bogus")).toBe("/owner/settings/join-code");
    expect(settingsRedirectPath(["categories"])).toBe("/owner/settings/join-code");
    expect(settingsRedirectPath(undefined)).not.toBe("/owner/settings/categories");
    expect(settingsRedirectPath("categories")).toBe("/owner/settings/categories");
    expect(settingsRedirectPath("locks")).toBe("/owner/settings/locks");
  });
});

describe("c4 — lock links for the owner, none for staff", () => {
  it("LockBadge without href renders no <a>; with href a ≥44px link «إقفال الأشهر»", () => {
    const plain = html(createElement(LockBadge));
    expect(plain).toContain(t.lock.badge);
    expect(plain).not.toContain("<a");

    const linked = html(createElement(LockBadge, { href: "/owner/settings/locks" }));
    expect(linked).toContain(t.lock.badge);
    const anchor = linked.match(/<a[^>]*>/)?.[0] ?? "";
    expect(anchor).toContain('href="/owner/settings/locks"');
    expect(anchor).toContain("min-h-11");
    expect(linked).toContain(t.navItem.locks);
  });

  it("LockedNotice likewise", () => {
    const plain = html(createElement(LockedNotice));
    expect(plain).toContain(t.lock.blockedTitle);
    expect(plain).not.toContain("<a");

    const linked = html(createElement(LockedNotice, { href: "/owner/settings/locks" }));
    const anchor = linked.match(/<a[^>]*>/)?.[0] ?? "";
    expect(anchor).toContain('href="/owner/settings/locks"');
    expect(anchor).toContain("min-h-11");
    expect(linked).toContain(t.navItem.locks);
  });

  it("the locks page links back to the ledger under its heading", async () => {
    const out = html(await LocksSettingsPage());
    expect(out).toContain(t.navItem.locks);
    expect(out).toContain(t.settings.backToLedger);
    expect(out).toContain('href="/owner/transactions"');
    expect(out.indexOf("<h1")).toBeLessThan(out.indexOf(t.settings.backToLedger));
  });
});

describe("c19 → R12 — «إلغاء الإقفال» and «إقفال» both ask first", () => {
  const row = (locked: boolean) => ({
    year: 2026,
    month: 9,
    ym: "2026-09",
    locked,
    lockedAt: locked ? "2026-10-01" : null,
    lockedByName: locked ? "مالك" : null,
    lockable: true,
  });

  it("a press on either month state reaches the confirm (R12 supersedes c19's one-tap lock)", () => {
    expect(pressTarget(true)).toBe("confirm");
    expect(pressTarget(false)).toBe("confirm");
  });

  it("the cell renders its button and no <dialog> until asked (one at most, not 24)", () => {
    const locked = html(createElement(LockCell, { row: row(true), label: "سبتمبر 2026" }));
    expect(locked).toContain(t.settings.unlock);
    expect(locked).not.toContain("<dialog");
    const open = html(createElement(LockCell, { row: row(false), label: "أغسطس 2026" }));
    expect(open).toContain(t.settings.lock);
    expect(open).not.toContain("<dialog");
  });

  it("the lock dialog names the month in its title and sentence; the unlock dialog is unchanged", () => {
    const lock = dialogText(false, "سبتمبر 2026");
    expect(lock.title).toBe(`${t.settings.lock}: سبتمبر 2026`);
    expect(lock.message).toBe(t.settings.lockConfirm.replace("{month}", "سبتمبر 2026"));
    expect(lock.message).toContain("سبتمبر 2026");
    expect(lock.message).not.toContain("{month}");
    const unlock = dialogText(true, "سبتمبر 2026");
    expect(unlock.title).toBe(`${t.settings.unlock}: سبتمبر 2026`);
    expect(unlock.message).toBe(t.settings.unlockConfirm);
  });

  it("the dialog takes its text from dialogText and the accent tone (static, anchored on its props)", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/features/settings/components/LockCell.tsx", "utf8");
    expect(source).toMatch(/<ConfirmDialog[\s\S]*?title=\{dialog\.title\}[\s\S]*?message=\{dialog\.message\}[\s\S]*?tone="accent"/);
    expect(source).toMatch(/pressTarget\(row\.locked\) === "confirm" \? setConfirm\(true\) : toggle\(\)/);
  });
});

// v1.4 part 3 (D29 R16, `words`): the locks page subtitle. Appended block (D32 S1).
describe("R16 — the locks page subtitle", () => {
  it("sits under the h1, before the way back; the card's own hint sentence stays", async () => {
    const out = html(await LocksSettingsPage());
    expect(out).toContain(t.settings.locksSubtitle);
    expect(out.indexOf("<h1")).toBeLessThan(out.indexOf(t.settings.locksSubtitle));
    expect(out.indexOf(t.settings.locksSubtitle)).toBeLessThan(out.indexOf(t.settings.backToLedger));
    expect(out).toContain(t.settings.locksHint);
  });
});

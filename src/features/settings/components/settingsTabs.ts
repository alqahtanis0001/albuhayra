/**
 * The active tab lives in the URL, for the same reason the ledger's filters do:
 * a reload, a back button or a shared link all keep the tab, and the page stays a
 * server component with no state to desynchronise.
 */
import { t } from "@/i18n/ar";

export const SETTINGS_PATH = "/owner/settings";

export const TAB_KEYS = [
  "categories",
  "staff",
  "joinCode",
  "locks",
  "account",
] as const;

export type SettingsTab = (typeof TAB_KEYS)[number];

const LABELS: Record<SettingsTab, string> = {
  categories: t.settings.tabCategories,
  staff: t.settings.tabStaff,
  joinCode: t.settings.tabJoinCode,
  locks: t.settings.tabLocks,
  account: t.settings.tabAccount,
};

/** Anything unrecognised falls back to the first tab rather than erroring. */
export function parseTab(raw: string | string[] | undefined): SettingsTab {
  return typeof raw === "string" && (TAB_KEYS as readonly string[]).includes(raw)
    ? (raw as SettingsTab)
    : "categories";
}

export function settingsTabs(): Array<{ key: SettingsTab; label: string; href: string }> {
  return TAB_KEYS.map((key) => ({
    key,
    label: LABELS[key],
    href: `${SETTINGS_PATH}?tab=${key}`,
  }));
}

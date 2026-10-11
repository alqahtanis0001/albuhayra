/**
 * v1.4 part 2 (docs/V14-SPEC.md D25): the rules behind «ابدأ هنا», the owner
 * home's first-run checklist. Pure and client-safe: the four facts arrive from
 * `getOwnerDashboard` as booleans (never an amount), the steps keep the spec's
 * order حركة → جهة → اتفاقية → موظف, and the «إخفاء» choice is the fourth and
 * last thing `localStorage` may hold (docs/FRONTEND.md › Do not). Every storage
 * access is guarded — private windows and blocked storage throw — and the card
 * works without it: it simply shows again next time.
 */
import { t } from "@/i18n/ar";

export type FirstRunFlags = {
  hasEntry: boolean;
  hasParty: boolean;
  hasPlan: boolean;
  hasEmployee: boolean;
};

export type FirstRunStepKey = "entry" | "party" | "plan" | "employee";

export type FirstRunStep = {
  key: FirstRunStepKey;
  label: string;
  /** The matching «+» destination, for a step not done yet. */
  href: string;
  done: boolean;
};

/** In the spec's order; each step reads one flag. */
export const FIRST_RUN_STEPS: ReadonlyArray<{
  key: FirstRunStepKey;
  labelKey: "stepEntry" | "stepParty" | "stepPlan" | "stepEmployee";
  href: string;
  flag: keyof FirstRunFlags;
}> = [
  { key: "entry", labelKey: "stepEntry", href: "/owner/transactions/new", flag: "hasEntry" },
  { key: "party", labelKey: "stepParty", href: "/owner/parties/new", flag: "hasParty" },
  { key: "plan", labelKey: "stepPlan", href: "/owner/plans/new", flag: "hasPlan" },
  { key: "employee", labelKey: "stepEmployee", href: "/owner/staff/new", flag: "hasEmployee" },
];

export function firstRunSteps(flags: FirstRunFlags): FirstRunStep[] {
  return FIRST_RUN_STEPS.map((step) => ({
    key: step.key,
    label: t.firstRun[step.labelKey],
    href: step.href,
    done: flags[step.flag] === true,
  }));
}

export function allDone(flags: FirstRunFlags): boolean {
  return FIRST_RUN_STEPS.every((step) => flags[step.flag] === true);
}

/** The card has something to show: not every step is done and the owner has not hidden it. */
export function shouldShowFirstRun(flags: FirstRunFlags, hidden: boolean): boolean {
  return !hidden && !allDone(flags);
}

export const FIRST_RUN_HIDDEN_KEY = "home:firstRunHidden";

export function readFirstRunHidden(): boolean {
  try {
    return window.localStorage.getItem(FIRST_RUN_HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberFirstRunHidden(): void {
  try {
    window.localStorage.setItem(FIRST_RUN_HIDDEN_KEY, "1");
  } catch {
    // Storage unavailable: the card is hidden for this page view and returns next time.
  }
}

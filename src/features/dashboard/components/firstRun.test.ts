import { afterEach, describe, expect, it, vi } from "vitest";

import { t } from "@/i18n/ar";

import {
  FIRST_RUN_HIDDEN_KEY,
  allDone,
  firstRunSteps,
  readFirstRunHidden,
  rememberFirstRunHidden,
  shouldShowFirstRun,
  type FirstRunFlags,
} from "./firstRun";

/**
 * v1.4 part 2 (docs/V14-SPEC.md D25): the first-run checklist's rules. The
 * four steps keep the spec's order حركة → جهة → اتفاقية → موظف, each reads its
 * own flag and links to its own «+» page; the card is for an owner who has not
 * done everything and has not hidden it; the «إخفاء» memory survives a
 * throwing `localStorage`.
 */

const none: FirstRunFlags = { hasEntry: false, hasParty: false, hasPlan: false, hasEmployee: false };
const all: FirstRunFlags = { hasEntry: true, hasParty: true, hasPlan: true, hasEmployee: true };

describe("firstRunSteps (D25)", () => {
  it("gives the four steps in the spec's order with their «+» destinations and labels", () => {
    expect(firstRunSteps(none)).toEqual([
      { key: "entry", label: t.firstRun.stepEntry, href: "/owner/transactions/new", done: false },
      { key: "party", label: t.firstRun.stepParty, href: "/owner/parties/new", done: false },
      { key: "plan", label: t.firstRun.stepPlan, href: "/owner/plans/new", done: false },
      { key: "employee", label: t.firstRun.stepEmployee, href: "/owner/staff/new", done: false },
    ]);
  });

  it("each step is done by exactly its own flag", () => {
    const pairs: Array<[keyof FirstRunFlags, string]> = [
      ["hasEntry", "entry"],
      ["hasParty", "party"],
      ["hasPlan", "plan"],
      ["hasEmployee", "employee"],
    ];
    for (const [flag, key] of pairs) {
      const steps = firstRunSteps({ ...none, [flag]: true });
      expect(steps.filter((s) => s.done).map((s) => s.key), flag).toEqual([key]);
    }
    expect(firstRunSteps(all).every((s) => s.done)).toBe(true);
  });
});

describe("allDone / shouldShowFirstRun (D25)", () => {
  it("allDone only when all four flags are true", () => {
    expect(allDone(all)).toBe(true);
    expect(allDone(none)).toBe(false);
    for (const flag of Object.keys(all) as Array<keyof FirstRunFlags>) {
      expect(allDone({ ...all, [flag]: false }), flag).toBe(false);
    }
  });

  it("the card shows unless everything is done or the owner hid it", () => {
    expect(shouldShowFirstRun(none, false)).toBe(true);
    expect(shouldShowFirstRun({ ...none, hasEntry: true }, false)).toBe(true);
    expect(shouldShowFirstRun(all, false)).toBe(false);
    expect(shouldShowFirstRun(none, true)).toBe(false);
  });
});

describe("the «إخفاء» memory (localStorage, guarded)", () => {
  afterEach(() => vi.unstubAllGlobals());

  function stubStore(): Map<string, string> {
    const store = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
      },
    });
    return store;
  }

  it("uses the agreed key and reads nothing stored as not hidden", () => {
    expect(FIRST_RUN_HIDDEN_KEY).toBe("home:firstRunHidden");
    stubStore();
    expect(readFirstRunHidden()).toBe(false);
  });

  it("remembers the hide and reads it back", () => {
    const store = stubStore();
    rememberFirstRunHidden();
    expect(store.get(FIRST_RUN_HIDDEN_KEY)).toBe("1");
    expect(readFirstRunHidden()).toBe(true);
  });

  it("works when storage throws: not hidden, and remembering does not throw", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("window", { localStorage: { getItem: boom, setItem: boom } });
    expect(readFirstRunHidden()).toBe(false);
    expect(() => rememberFirstRunHidden()).not.toThrow();
  });

  it("without a window at all (the server), reads not hidden", () => {
    vi.stubGlobal("window", undefined);
    expect(readFirstRunHidden()).toBe(false);
  });
});

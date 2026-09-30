/**
 * v1.3 item 11 (docs/V13-SPEC.md) — pure helpers for the live clock card.
 * The late rule is `derivedStatus` in src/lib/attendance.ts: LATE iff the
 * check-in's HH:MM is > start + grace. So a check-in stays on time through the
 * whole minute start + grace, and the ring turns red at start + grace + 1:00.
 * The window the ring shows runs from the start to that moment:
 * (grace + 1) minutes; before the start the ring is full.
 */
import { toMinutes } from "@/lib/attendance";

/** Riyadh is UTC+3 all year (no DST). */
const RIYADH_OFFSET_S = 3 * 3600;
const DAY_S = 86_400;

/** Seconds since midnight on the Riyadh wall clock. */
export function riyadhSecondOfDay(nowMs: number): number {
  const s = Math.floor(nowMs / 1000) + RIYADH_OFFSET_S;
  return ((s % DAY_S) + DAY_S) % DAY_S;
}

export type GraceLeft = {
  /** Seconds until a check-in would be late (≤ 0 once late). */
  leftSec: number;
  /** Ring fill 0..1 of the (grace + 1)-minute window; 1 before the start. */
  fraction: number;
  tone: "green" | "amber" | "red";
  late: boolean;
  /** Whole minutes left for the text; 0 = «أقل من دقيقة». */
  minutes: number;
};

export function graceLeft(nowMs: number, workStart: string, graceMinutes: number): GraceLeft {
  const now = riyadhSecondOfDay(nowMs);
  const deadline = (toMinutes(workStart) + graceMinutes + 1) * 60;
  const windowSec = (graceMinutes + 1) * 60;
  const leftSec = deadline - now;
  const late = leftSec <= 0;
  const fraction = late ? 0 : Math.min(1, leftSec / windowSec);
  const tone = late ? "red" : leftSec < 5 * 60 ? "amber" : "green";
  return { leftSec, fraction, tone, late, minutes: late ? 0 : Math.floor(leftSec / 60) };
}

/**
 * The ring's stroke-dasharray in real circumference units (no `pathLength`,
 * which older iOS Safari ignores): the arc for `fraction` of a circle of
 * radius `r`, then a gap of the whole circumference. Rounded to 0.01.
 */
export function ringDash(fraction: number, r: number): string {
  const c = 2 * Math.PI * r;
  const round = (n: number) => Math.round(n * 100) / 100;
  const f = Math.min(1, Math.max(0, fraction));
  return `${round(f * c)} ${round(c)}`;
}

const CLOCK = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Riyadh",
  numberingSystem: "latn",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** "HH:MM:SS" on the Riyadh wall clock, Western digits. */
export function formatClock(nowMs: number): string {
  return CLOCK.format(new Date(nowMs));
}

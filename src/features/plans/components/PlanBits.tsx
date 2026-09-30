/**
 * Small pieces the agreement and dues screens share. Server-safe (no hooks).
 *
 * Status is always a word (`t.planStatus` / `t.instalmentStatus`), never
 * colour alone; the countdown is a counted phrase through `plural()` (V10),
 * computed from the server's `dayOffset` (W8 — the browser never decides
 * "today").
 */
import { Badge, type BadgeTone } from "@/components/Badge";
import { t } from "@/i18n/ar";
import type { InstalmentStatus, PlanStatus } from "@/lib/instalments";
import { plural } from "@/lib/plural";
import type { DirectionValue, PartyTypeValue } from "@/lib/validation";

const PLAN_TONE: Record<PlanStatus, BadgeTone> = {
  UPCOMING: "neutral",
  ACTIVE: "accent",
  COMPLETED: "in",
  ARCHIVED: "neutral",
  CANCELLED: "warn",
};

const INSTALMENT_TONE: Record<InstalmentStatus, BadgeTone> = {
  UPCOMING: "neutral",
  DUE: "warn",
  OVERDUE: "out",
  PARTIAL: "accent",
  PAID: "in",
};

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return <Badge tone={PLAN_TONE[status]}>{t.planStatus[status]}</Badge>;
}

export function InstalmentStatusBadge({ status }: { status: InstalmentStatus }) {
  return <Badge tone={INSTALMENT_TONE[status]}>{t.instalmentStatus[status]}</Badge>;
}

/** «بعد 3 أيام» / «مستحقة اليوم» / «متأخرة يومين»; nothing once paid. */
export function countdownText(dayOffset: number, status: InstalmentStatus): string | null {
  if (status === "PAID") return null;
  if (dayOffset === 0) return t.countdown.today;
  return dayOffset > 0
    ? plural(t.countdown.inDays, dayOffset)
    : plural(t.countdown.lateDays, -dayOffset);
}

export function Countdown({
  dayOffset,
  status,
  className = "",
}: {
  dayOffset: number;
  status: InstalmentStatus;
  className?: string;
}) {
  const text = countdownText(dayOffset, status);
  if (!text) return null;
  return (
    <span className={`text-xs ${dayOffset < 0 ? "font-medium text-money-out" : "text-gray-600"} ${className}`}>
      {text}
    </span>
  );
}

/** «سيدفع لنا» / «سندفع له», after the party's name where there is room. */
export function directionWording(direction: DirectionValue): string {
  return t.planDirection[direction];
}

/** «سُدّد {paid} من {count}» — plain numbers, no plural agreement needed. */
export function progressText(paidCount: number, instalmentCount: number): string {
  return t.plans.progress
    .replace("{paid}", String(paidCount))
    .replace("{count}", String(instalmentCount));
}

/**
 * The direction a new agreement starts with, from the party's type (Decision
 * 13): عميل → وارد, مورد/موظف → صادر, أخرى → none. Always changeable.
 */
export const DEFAULT_DIRECTION: Record<PartyTypeValue, DirectionValue | ""> = {
  CUSTOMER: "IN",
  SUPPLIER: "OUT",
  EMPLOYEE: "OUT",
  OTHER: "",
};

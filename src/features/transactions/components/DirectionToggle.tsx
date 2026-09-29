"use client";

/**
 * وارد / صادر as a segmented pair of radios — real inputs, so they are
 * keyboard-navigable and labelled without any ARIA of our own.
 *
 * The default is the last direction used, kept in localStorage. This is the
 * **only** sanctioned localStorage use in the app (docs/FRONTEND.md, Do not),
 * and every access is wrapped: a private window or blocked site data makes the
 * accessor throw, and the form must still work.
 */
import { t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

const KEY = "ledger:lastDirection";

export function readLastDirection(): DirectionValue {
  try {
    return localStorage.getItem(KEY) === "IN" ? "IN" : "OUT";
  } catch {
    return "OUT";
  }
}

export function rememberDirection(direction: DirectionValue): void {
  try {
    localStorage.setItem(KEY, direction);
  } catch {
    // No storage available. The default simply stays صادر next time.
  }
}

export function DirectionToggle({
  value,
  onChange,
  disabled = false,
}: {
  value: DirectionValue;
  onChange: (next: DirectionValue) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium text-gray-700">
        {t.direction.label}
      </legend>
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-gray-300">
        <Segment
          current={value}
          option="OUT"
          label={t.direction.OUT}
          onChange={onChange}
        />
        <Segment
          current={value}
          option="IN"
          label={t.direction.IN}
          onChange={onChange}
        />
      </div>
    </fieldset>
  );
}

function Segment({
  current,
  option,
  label,
  onChange,
}: {
  current: DirectionValue;
  option: DirectionValue;
  label: string;
  onChange: (next: DirectionValue) => void;
}) {
  const active = current === option;
  const tone = option === "IN" ? "bg-money-in" : "bg-money-out";

  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-center text-sm font-medium ${
        active ? `${tone} text-white` : "bg-white text-gray-700"
      }`}
    >
      <input
        type="radio"
        name="direction"
        value={option}
        checked={active}
        onChange={() => onChange(option)}
        className="sr-only"
      />
      {label}
    </label>
  );
}

export default DirectionToggle;

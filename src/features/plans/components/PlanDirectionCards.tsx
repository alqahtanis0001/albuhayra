"use client";

/**
 * The agreement's direction as two radio cards worded from the party's side
 * («سيدفع لنا» / «سندفع له», `t.planDirection`) under the party's name. Colour
 * follows وارد/صادر but the words carry the meaning. Locked (disabled, with the
 * value posted by the form's hidden field) once any instalment is fixed.
 */
import { errorMessage, t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

export function PlanDirectionCards({
  value,
  partyName,
  locked,
  error,
  onChange,
}: {
  value: DirectionValue | "";
  partyName?: string;
  locked: boolean;
  error?: string;
  onChange: (next: DirectionValue) => void;
}) {
  return (
    <fieldset disabled={locked} className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium text-gray-700">
        {t.planDirection.label}
        <span aria-hidden="true"> *</span>
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {(["IN", "OUT"] as const).map((d) => (
          <label
            key={d}
            className={`flex min-h-14 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 py-2 text-center text-sm font-medium transition-[scale] duration-[80ms] ease-out active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-accent ${
              value === d
                ? d === "IN"
                  ? "border-money-in bg-money-in-soft text-money-in"
                  : "border-money-out bg-money-out-soft text-money-out"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          >
            <input
              type="radio"
              name={locked ? undefined : "direction"}
              value={d}
              checked={value === d}
              onChange={() => onChange(d)}
              className="sr-only"
            />
            {partyName ? <span className="text-xs font-normal">{partyName}</span> : null}
            {t.planDirection[d]}
          </label>
        ))}
      </div>
      {error ? <p className="text-xs font-medium text-money-out">{errorMessage(error)}</p> : null}
    </fieldset>
  );
}

export default PlanDirectionCards;

"use client";

/**
 * أيام العمل: seven day chips, Sunday first (the week as it is read here), each
 * a real checkbox so the pressed state is announced and not colour alone (the
 * chosen chip also carries a check mark). The field posts one integer
 * `workDays` mask (Y9); none chosen is refused (err.workDaysEmpty).
 */
import { CheckIcon } from "@/components/icons";
import { errorMessage, t } from "@/i18n/ar";

import { WEEKDAYS, hasDay, toggleDay } from "./employeeDraft";

export function WorkDaysField({
  value,
  onChange,
  error,
}: {
  value: number;
  onChange: (mask: number) => void;
  error?: string;
}) {
  const shown = error ?? (value === 0 ? "err.workDaysEmpty" : undefined);
  return (
    <fieldset className="flex flex-col gap-1" aria-describedby={shown ? "workDays-error" : undefined}>
      <legend className="mb-1 text-sm font-medium text-gray-700">
        {t.employees.workDays}
        <span aria-hidden="true"> *</span>
      </legend>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {WEEKDAYS.map((day) => {
          const checked = hasDay(value, day);
          return (
            <label
              key={day}
              className={`flex min-h-11 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 text-sm font-medium transition-[scale] duration-[80ms] ease-out active:scale-[0.97] has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent ${
                checked
                  ? "border-accent bg-accent-soft text-accent-dark"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onChange(toggleDay(value, day))}
                className="sr-only"
              />
              {checked ? <CheckIcon size={14} /> : null}
              {t.weekday[day]}
            </label>
          );
        })}
      </div>
      <input type="hidden" name="workDays" value={value} />
      {shown ? (
        <p id="workDays-error" className="text-xs font-medium text-money-out">
          {errorMessage(shown)}
        </p>
      ) : null}
    </fieldset>
  );
}

export default WorkDaysField;

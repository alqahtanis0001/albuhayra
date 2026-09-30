"use client";

/**
 * An on/off switch (v1.2c): a native checkbox with `role="switch"`, named by
 * its wrapping label, so it posts like any checkbox inside a form and is
 * announced as a switch. The track and knob are decoration; the knob sits at
 * the inline start when off and moves to the end when on (a logical margin, so
 * it runs right to left here). The off track is gray-500 for 3:1 on white.
 */
import { useId, type ChangeEvent } from "react";

export function Switch({
  label,
  checked,
  onChange,
  name,
  disabled = false,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Set inside a form so the value is posted ("on" when checked). */
  name?: string;
  disabled?: boolean;
  hint?: string;
}) {
  const hintId = useId();
  return (
    <div className="flex flex-col gap-1">
      <label
        className={`flex min-h-11 items-center justify-between gap-3 ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <input
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          disabled={disabled}
          aria-describedby={hint ? hintId : undefined}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent motion-reduce:transition-none ${
            checked ? "bg-accent" : "bg-gray-500"
          }`}
        >
          <span
            className={`size-5 rounded-full bg-white shadow-sm transition-[margin] duration-150 ease-out motion-reduce:transition-none ${
              checked ? "ms-5.5" : "ms-0.5"
            }`}
          />
        </span>
      </label>
      {hint ? (
        <p id={hintId} className="text-xs text-gray-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Switch;

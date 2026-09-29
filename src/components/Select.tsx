import type { SelectHTMLAttributes } from "react";

import { errorMessage } from "@/i18n/ar";

export type SelectOption = { value: string; label: string };
/** An `<optgroup>`: rendered after the plain `options`, in order. */
export type SelectGroup = { label: string; options: SelectOption[] };

// `children` stays excluded: the options come from `options`, and accepting both
// would let a caller build a select two ways at once.
export type SelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "children"
> & {
  label: string;
  /**
   * Omit only for a select that is not itself a form field (v1.2a: the entry
   * form's الجهة picker, whose value travels in a hidden input) — then pass `id`.
   */
  name?: string;
  options: SelectOption[];
  /** Optional labelled groups after `options` (v1.2a: parties by type). */
  groups?: SelectGroup[];
  /** Plain options after the groups (v1.2a: «أخرى (اكتب الاسم)», always last). */
  trailing?: SelectOption[];
  /** An `err.*` i18n key from `fieldErrors`. */
  error?: string;
  hint?: string;
  /** Shown as a disabled first option when the field has no value yet. */
  placeholder?: string;
};

export function Select({
  label,
  name,
  id,
  options,
  groups = [],
  trailing = [],
  error,
  hint,
  placeholder,
  className = "",
  required,
  ...rest
}: SelectProps) {
  const fieldId = id ?? name ?? "";
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <select
        id={fieldId}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={[
          "min-h-11 w-full rounded-lg border bg-white px-3 text-base text-gray-900",
          error ? "border-money-out" : "border-gray-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {placeholder ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {groups
          .filter((group) => group.options.length > 0)
          .map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        {trailing.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {hint ? (
        <p id={hintId} className="text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-money-out">
          {errorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

export default Select;

import type { InputHTMLAttributes, ReactNode, Ref } from "react";

import { errorMessage } from "@/i18n/ar";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  /**
   * Defaults to `name`. Pass it when the same field name appears more than once
   * on a page — one reset-password form per staff row — because a name-derived id
   * would duplicate and every label would point at the first field.
   */
  id?: string;
  /** An `err.*` i18n key from `fieldErrors`, not Arabic text. */
  error?: string;
  hint?: string;
  /** Rendered after the field, e.g. the ر.س suffix on an amount. */
  suffix?: string;
  /**
   * Rendered under the hint and error — the password strength meter, the
   * email typo hint. Give anything the field should announce an id and pass
   * it as `describedBy` too.
   */
  children?: ReactNode;
  describedBy?: string;
  /** Reaches the <input> (React 19 passes `ref` as a prop). */
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  label,
  name,
  id,
  error,
  hint,
  suffix,
  children,
  describedBy,
  className = "",
  required,
  ...rest
}: InputProps) {
  const fieldId = id ?? name;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <div className="relative">
        <input
          id={fieldId}
          name={name}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId, describedBy].filter(Boolean).join(" ") || undefined}
          className={[
            "min-h-11 w-full rounded-lg border bg-white px-3 text-base text-gray-900",
            "placeholder:text-gray-500",
            suffix ? "pe-14" : "",
            error ? "border-money-out" : "border-gray-300",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-gray-500"
          >
            {suffix}
          </span>
        ) : null}
      </div>

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
      {children}
    </div>
  );
}

export default Input;

import type { TextareaHTMLAttributes } from "react";

import { errorMessage } from "@/i18n/ar";

export type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> & {
  label: string;
  name: string;
  /** An `err.*` i18n key from `fieldErrors`. */
  error?: string;
  hint?: string;
};

export function Textarea({
  label,
  name,
  error,
  hint,
  className = "",
  rows = 3,
  required,
  ...rest
}: TextareaProps) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>

      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
        className={[
          "w-full rounded-lg border bg-white p-3 text-base text-gray-900",
          "placeholder:text-gray-400",
          error ? "border-money-out" : "border-gray-300",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      />

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

export default Textarea;

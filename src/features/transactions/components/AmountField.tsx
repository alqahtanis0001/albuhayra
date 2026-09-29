"use client";

/**
 * The visible field takes what the user types; a hidden field carries the
 * integer halalas the action reads. `parseSAR` returns null — it never throws —
 * for empty, zero, negative, more than two decimals or out-of-range, and null is
 * a field error rather than something to submit.
 */
import { errorMessage, t } from "@/i18n/ar";
import { parseSAR } from "@/lib/money";

export function AmountField({
  value,
  onChange,
  error,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  /** An `err.*` key from fieldErrors. */
  error?: string;
  disabled?: boolean;
}) {
  const halalas = parseSAR(value);
  // Only complain once something has been typed; an untouched field is not wrong yet.
  const localError = value.trim() !== "" && halalas === null;
  const shown = error ?? (localError ? "err.amountInvalid" : undefined);

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="amount" className="text-sm font-medium text-gray-700">
        {t.transaction.amount}
        <span aria-hidden="true"> *</span>
      </label>

      <div className="relative">
        <input
          id="amount"
          name="amountInput"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={shown ? true : undefined}
          aria-describedby={shown ? "amount-error" : undefined}
          className={`min-h-11 w-full rounded-lg border bg-white px-3 pe-14 text-base text-gray-900 ${
            shown ? "border-money-out" : "border-gray-300"
          }`}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-gray-500"
        >
          {t.common.currency}
        </span>
      </div>

      {/* What the action actually parses: an integer number of halalas. */}
      <input type="hidden" name="amountHalalas" value={halalas ?? ""} />

      {shown ? (
        <p id="amount-error" className="text-xs font-medium text-money-out">
          {errorMessage(shown)}
        </p>
      ) : null}
    </div>
  );
}

export default AmountField;

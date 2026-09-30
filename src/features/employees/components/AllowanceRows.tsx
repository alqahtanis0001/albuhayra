"use client";

/**
 * البدلات: zero or more rows of type (سكن / نقل / أخرى), a name for «أخرى»,
 * and an amount. The row controls carry `form="__none"`, so FormData holds only
 * the one JSON `allowances` field the action reads. Each row is checked with
 * the contract's own row schema as the owner types; the server re-checks.
 */
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { errorMessage, t } from "@/i18n/ar";
import { AllowanceTypeEnum, MAX_ALLOWANCES, type AllowanceTypeValue } from "@/lib/validation";

import { allowanceRowErrors, allowancesJson, type AllowanceDraft } from "./employeeDraft";

let nextKey = 0;
export const newAllowance = (): AllowanceDraft => ({
  key: `a${nextKey++}`,
  type: "HOUSING",
  label: "",
  amount: "",
});

export function AllowanceRows({
  rows,
  onChange,
  error,
}: {
  rows: AllowanceDraft[];
  onChange: (rows: AllowanceDraft[]) => void;
  /** The server's `allowances` fieldError, if any. */
  error?: string;
}) {
  const update = (key: string, patch: Partial<AllowanceDraft>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-gray-700">
        {t.employees.allowances} ({t.common.optional})
      </legend>
      <input type="hidden" name="allowances" value={allowancesJson(rows)} />

      {rows.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {rows.map((row, i) => {
            const errors = allowanceRowErrors(row);
            return (
              <li key={row.key} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {t.employees.allowances} <bdi className="tabular-nums">{i + 1}</bdi>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${t.employees.removeAllowance} ${i + 1}`}
                    onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
                  >
                    <TrashIcon size={18} />
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Select
                    label={t.employees.allowanceType}
                    id={`allowance-type-${row.key}`}
                    form="__none"
                    options={AllowanceTypeEnum.options.map((type) => ({
                      value: type,
                      label: t.allowanceType[type],
                    }))}
                    value={row.type}
                    onChange={(e) => update(row.key, { type: e.target.value as AllowanceTypeValue })}
                  />
                  <Input
                    label={t.employees.allowanceAmount}
                    name={`allowance-amount-${row.key}`}
                    form="__none"
                    inputMode="decimal"
                    autoComplete="off"
                    dir="ltr"
                    suffix={t.common.currency}
                    value={row.amount}
                    onChange={(e) => update(row.key, { amount: e.target.value })}
                    required
                    error={errors.amount}
                  />
                  {row.type === "OTHER" ? (
                    <Input
                      label={t.employees.allowanceLabel}
                      name={`allowance-label-${row.key}`}
                      form="__none"
                      value={row.label}
                      maxLength={60}
                      onChange={(e) => update(row.key, { label: e.target.value })}
                      required
                      error={errors.label}
                    />
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {rows.length < MAX_ALLOWANCES ? (
        <div>
          <Button variant="secondary" size="sm" onClick={() => onChange([...rows, newAllowance()])}>
            <PlusIcon size={16} />
            {t.employees.addAllowance}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-xs font-medium text-money-out">{errorMessage(error)}</p> : null}
    </fieldset>
  );
}

export default AllowanceRows;

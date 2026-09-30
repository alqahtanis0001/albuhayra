"use client";

/**
 * Add / edit an employee (docs/V12B-DESIGN.md §4; spec §3.1–3.2). Controlled
 * fields, so a refused submit keeps what the owner typed. `EmployeeInputSchema`
 * runs here first (with the JSON `allowances` parsed, as the action does) and
 * again on the server. A basic salary that was typed but does not parse is an
 * error here — AmountField would otherwise post "" and save "no salary".
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { t } from "@/i18n/ar";
import { parseSAR } from "@/lib/money";
import { EmployeeInputSchema, invalid, type ActionResult } from "@/lib/validation";

import {
  InfoSection,
  LoginSection,
  SalarySection,
  ScheduleSection,
  type AdoptableParty,
  type EmployeeFormValues,
  type Option,
} from "./EmployeeFormSections";

type Result = ActionResult<{ id: string }> | ActionResult<null>;
export type EmployeeFormAction = (prev: Result | null, formData: FormData) => Promise<Result>;

function refuse(field: string, key: string): Result {
  return { ok: false, error: "err.invalidInput", fieldErrors: { [field]: key } };
}

export function EmployeeForm({
  action,
  initial,
  employeeId,
  staff,
  adoptable,
}: {
  action: EmployeeFormAction;
  initial: EmployeeFormValues;
  /** Edit: where to return. New: the created id comes back from the action. */
  employeeId?: string;
  /** listLinkableStaff: unlinked ACTIVE staff, plus this employee's own link. */
  staff: Option[];
  /** New only: موظف parties with no profile yet (D14). */
  adoptable?: AdoptableParty[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<EmployeeFormValues>(initial);
  const set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      if (values.basic.trim() !== "" && parseSAR(values.basic) === null) {
        return refuse("basicSalaryHalalas", "err.amountInvalid");
      }
      const raw = Object.fromEntries(formData);
      let allowances: unknown;
      try {
        allowances = JSON.parse(String(raw.allowances ?? "[]"));
      } catch {
        return refuse("allowances", "err.allowancesInvalid");
      }
      const parsed = EmployeeInputSchema.safeParse({ ...raw, allowances });
      if (!parsed.success) return invalid(parsed.error);
      // No try/catch: a redirecting action throws (see TransactionForm).
      const result = await action(prev, formData);
      if (result.ok) {
        const id = result.data?.id ?? employeeId;
        router.push(id ? `/owner/staff/${id}` : "/owner/staff");
      }
      return result;
    },
    null,
  );
  const errors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4" noValidate>
      <InfoSection values={values} set={set} errors={errors} adoptable={adoptable} />
      <ScheduleSection values={values} set={set} errors={errors} />
      <SalarySection values={values} set={set} errors={errors} hadSalary={initial.basic !== ""} />
      <LoginSection values={values} set={set} errors={errors} staff={staff} />

      <p className="text-xs text-gray-600">{t.employees.privacyNote}</p>

      <div>
        <Button type="submit" pending={pending} disabled={values.workDays === 0}>
          {t.common.save}
        </Button>
      </div>

      <FormToast state={state} />
    </form>
  );
}

export default EmployeeForm;

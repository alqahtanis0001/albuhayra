/**
 * The profile form's starting values: empty for a new employee (hire date =
 * the server's today, Sunday–Thursday), or an existing profile's fields as
 * text. Server-safe; the pages build these and hand them to EmployeeForm.
 */
import type { EmployeeDetail } from "@/features/employees/queries";
import { toAmountText } from "@/features/plans/components/scheduleDraft";
import { DEFAULT_WORK_DAYS } from "@/lib/validation";

import type { EmployeeFormValues } from "./EmployeeFormSections";

export function emptyEmployeeValues(today: string): EmployeeFormValues {
  return {
    partyId: "",
    name: "",
    jobTitle: "",
    startDate: today,
    phone: "",
    email: "",
    notes: "",
    workDays: DEFAULT_WORK_DAYS,
    workStart: "",
    workEnd: "",
    graceMinutes: "",
    basic: "",
    payDay: "",
    allowances: [],
    userId: "",
  };
}

export function employeeValues(e: EmployeeDetail): EmployeeFormValues {
  return {
    partyId: "",
    name: e.name,
    jobTitle: e.jobTitle ?? "",
    startDate: e.startDate,
    phone: e.phone ?? "",
    email: e.email ?? "",
    notes: e.notes ?? "",
    workDays: e.workDays,
    workStart: e.workStart ?? "",
    workEnd: e.workEnd ?? "",
    graceMinutes: e.graceMinutes === null ? "" : String(e.graceMinutes),
    basic: e.basicSalaryHalalas === null ? "" : toAmountText(e.basicSalaryHalalas),
    payDay: e.payDay === null ? "" : String(e.payDay),
    // Deterministic keys: these render on the server too.
    allowances: e.allowances.map((a, i) => ({
      key: `s${i}`,
      type: a.type,
      label: a.label ?? "",
      amount: toAmountText(a.amountHalalas),
    })),
    userId: e.userId ?? "",
  };
}

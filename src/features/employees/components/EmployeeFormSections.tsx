"use client";

/**
 * The profile form's four sections (docs/V12B-DESIGN.md §4): البيانات · الدوام ·
 * الراتب · حساب الدخول. Presentational only — EmployeeForm holds the state.
 * There is deliberately no field for ID/iqama, IBAN, date of birth, photos or
 * documents (spec §3.1), and none for the category: salaries always go to
 * «رواتب» (X4).
 */
import { Card } from "@/components/Card";
import { Input } from "@/components/Input";
import { MoneyText } from "@/components/MoneyText";
import { Select } from "@/components/Select";
import { Textarea } from "@/components/Textarea";
import { AmountField } from "@/features/transactions/components/AmountField";
import { t } from "@/i18n/ar";
import { toWesternDigits } from "@/lib/money";

import { AllowanceRows } from "./AllowanceRows";
import { WorkDaysField } from "./WorkDaysField";
import { grossHalalas, type AllowanceDraft } from "./employeeDraft";

export type EmployeeFormValues = {
  partyId: string;
  name: string;
  jobTitle: string;
  startDate: string;
  phone: string;
  email: string;
  notes: string;
  workDays: number;
  workStart: string;
  workEnd: string;
  graceMinutes: string;
  basic: string;
  payDay: string;
  allowances: AllowanceDraft[];
  userId: string;
};

/** A linkable login; the email tells apart two staff with the same name. */
export type Option = { id: string; name: string; email?: string };
export type AdoptableParty = { id: string; name: string; phone: string | null; email: string | null };

type Errors = Record<string, string> | undefined;
type Set = <K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) => void;
type Props = { values: EmployeeFormValues; set: Set; errors: Errors };

const opt = (label: string) => `${label} (${t.common.optional})`;

export function InfoSection({ values, set, errors, adoptable }: Props & { adoptable?: AdoptableParty[] }) {
  const adopt = (id: string) => {
    set("partyId", id);
    const party = adoptable?.find((p) => p.id === id);
    if (!party) return;
    // Y9: the profile owns the party; start from what it already holds.
    set("name", party.name);
    set("phone", party.phone ?? "");
    set("email", party.email ?? "");
  };
  return (
    <Card title={t.employees.sectionInfo}>
      <div className="flex flex-col gap-4">
        {adoptable && adoptable.length > 0 ? (
          <Select
            label={t.employees.adoptParty}
            name="partyId"
            options={[
              { value: "", label: t.employees.newParty },
              ...adoptable.map((p) => ({ value: p.id, label: p.name })),
            ]}
            value={values.partyId}
            onChange={(e) => adopt(e.target.value)}
            hint={t.employees.adoptPartyHelp}
            error={errors?.partyId}
          />
        ) : null}
        <Input
          label={t.employees.name}
          name="name"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          hint={t.employees.nameHelp}
          maxLength={80}
          required
          error={errors?.name}
        />
        <Input
          label={opt(t.employees.jobTitle)}
          name="jobTitle"
          value={values.jobTitle}
          onChange={(e) => set("jobTitle", e.target.value)}
          maxLength={80}
          error={errors?.jobTitle}
        />
        <Input
          label={t.employees.startDate}
          name="startDate"
          type="date"
          value={values.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          required
          error={errors?.startDate}
        />
        <Input
          label={opt(t.parties.phone)}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="off"
          dir="ltr"
          value={values.phone}
          onChange={(e) => set("phone", e.target.value)}
          hint={t.parties.phoneHelp}
          maxLength={25}
          error={errors?.phone}
        />
        <Input
          label={opt(t.parties.email)}
          name="email"
          type="email"
          autoComplete="off"
          dir="ltr"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          hint={t.parties.emailHelp}
          maxLength={254}
          error={errors?.email}
        />
        <Textarea
          label={opt(t.employees.notes)}
          name="notes"
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          maxLength={500}
          error={errors?.notes}
        />
      </div>
    </Card>
  );
}

export function ScheduleSection({ values, set, errors }: Props) {
  return (
    <Card title={t.employees.sectionSchedule}>
      <div className="flex flex-col gap-4">
        <WorkDaysField value={values.workDays} onChange={(mask) => set("workDays", mask)} error={errors?.workDays} />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={opt(t.employees.workStart)}
            name="workStart"
            type="time"
            step={60}
            dir="ltr"
            value={values.workStart}
            onChange={(e) => set("workStart", e.target.value)}
            error={errors?.workStart}
          />
          <Input
            label={opt(t.employees.workEnd)}
            name="workEnd"
            type="time"
            step={60}
            dir="ltr"
            value={values.workEnd}
            onChange={(e) => set("workEnd", e.target.value)}
            error={errors?.workEnd}
          />
        </div>
        <Input
          label={opt(t.employees.graceMinutes)}
          name="graceMinutes"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          value={values.graceMinutes}
          onChange={(e) => set("graceMinutes", toWesternDigits(e.target.value))}
          hint={t.employees.graceHelp}
          maxLength={3}
          error={errors?.graceMinutes}
        />
      </div>
    </Card>
  );
}

export function SalarySection({ values, set, errors, hadSalary }: Props & { hadSalary: boolean }) {
  const gross = grossHalalas(values.basic, values.allowances);
  return (
    <Card title={t.employees.sectionSalary}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-700">{t.employees.salaryHelp}</p>
        <AmountField
          label={opt(t.employees.basicSalary)}
          id="basicSalary"
          name="basicSalaryHalalas"
          required={false}
          value={values.basic}
          onChange={(next) => set("basic", next)}
          error={errors?.basicSalaryHalalas}
        />
        {hadSalary && values.basic.trim() === "" ? (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t.employees.salaryRemovedNote}
          </p>
        ) : null}
        <AllowanceRows rows={values.allowances} onChange={(rows) => set("allowances", rows)} error={errors?.allowances} />
        <Input
          label={t.employees.payDay}
          name="payDay"
          inputMode="numeric"
          autoComplete="off"
          dir="ltr"
          value={values.payDay}
          onChange={(e) => set("payDay", toWesternDigits(e.target.value))}
          hint={t.employees.payDayHelp}
          maxLength={2}
          required={values.basic.trim() !== ""}
          error={errors?.payDay}
        />
        <p className="text-sm font-medium text-gray-900 empty:hidden" aria-live="polite">
          {gross !== null ? (
            <>
              {t.employees.gross}: <MoneyText halalas={gross} />
            </>
          ) : null}
        </p>
        <p className="text-xs text-gray-600">{t.employees.salaryCategoryNote}</p>
      </div>
    </Card>
  );
}

export function LoginSection({ values, set, errors, staff }: Props & { staff: Option[] }) {
  return (
    <Card title={t.employees.sectionLogin}>
      <Select
        label={t.employees.linkedLogin}
        name="userId"
        options={[
          { value: "", label: t.employees.noLogin },
          ...staff.map((s) => ({ value: s.id, label: s.email ? `${s.name} (${s.email})` : s.name })),
        ]}
        value={values.userId}
        onChange={(e) => set("userId", e.target.value)}
        hint={t.employees.linkedLoginHelp}
        error={errors?.userId}
      />
    </Card>
  );
}

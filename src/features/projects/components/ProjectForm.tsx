"use client";

/**
 * Add / edit an إضافة (docs/FRONTEND.md, إضافة). The budget is optional and
 * uses AmountField, whose hidden field carries the integer halalas; an empty
 * field submits "" (no budget — the action writes null). Controlled fields, so
 * a refused submit keeps the input.
 */
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { AmountField } from "@/features/transactions/components/AmountField";
import { t } from "@/i18n/ar";
import { ProjectInputSchema, invalid, type ActionResult } from "@/lib/validation";

type Result = ActionResult<{ id: string }> | ActionResult<null>;
export type ProjectFormAction = (prev: Result | null, formData: FormData) => Promise<Result>;

export type ProjectFormValues = {
  name: string;
  description: string;
  /** What the owner types, e.g. "1500.00"; "" = no budget. */
  budget: string;
  startDate: string;
  endDate: string;
};

export function ProjectForm({
  action,
  initial,
  projectId,
}: {
  action: ProjectFormAction;
  initial: ProjectFormValues;
  projectId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const set = (key: keyof ProjectFormValues, value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const [state, formAction, pending] = useActionState(
    async (prev: Result | null, formData: FormData): Promise<Result | null> => {
      const raw = Object.fromEntries(formData);
      // Typed but unparseable: the hidden field is "", which would otherwise
      // read as "no budget" and silently drop what was typed.
      if (String(raw.budgetInput ?? "").trim() !== "" && raw.budgetHalalas === "") {
        return {
          ok: false,
          error: "err.invalidInput",
          fieldErrors: { budgetHalalas: "err.amountInvalid" },
        };
      }
      const parsed = ProjectInputSchema.safeParse(raw);
      if (!parsed.success) return invalid(parsed.error);
      const result = await action(prev, formData);
      if (result.ok) {
        const id = result.data?.id ?? projectId;
        router.push(id ? `/owner/projects/${id}` : "/owner/projects");
      }
      return result;
    },
    null,
  );
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4" noValidate>
      <Input
        label={t.projects.name}
        name="name"
        value={values.name}
        onChange={(e) => set("name", e.target.value)}
        hint={t.projects.nameHelp}
        maxLength={80}
        required
        error={fieldErrors?.name}
      />

      <Textarea
        label={`${t.projects.description} (${t.common.optional})`}
        name="description"
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
        maxLength={1000}
        error={fieldErrors?.description}
      />

      <AmountField
        id="budget"
        name="budgetHalalas"
        label={`${t.projects.budget} (${t.common.optional})`}
        required={false}
        hint={t.projects.budgetHelp}
        value={values.budget}
        onChange={(next) => set("budget", next)}
        error={fieldErrors?.budgetHalalas}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t.projects.startDate}
          name="startDate"
          type="date"
          value={values.startDate}
          onChange={(e) => set("startDate", e.target.value)}
          required
          error={fieldErrors?.startDate}
        />
        <Input
          label={`${t.projects.endDate} (${t.common.optional})`}
          name="endDate"
          type="date"
          value={values.endDate}
          min={values.startDate || undefined}
          onChange={(e) => set("endDate", e.target.value)}
          error={fieldErrors?.endDate}
        />
      </div>

      <div>
        <Button type="submit" pending={pending}>
          {t.common.save}
        </Button>
      </div>

      <FormToast state={state} />
    </form>
  );
}

export default ProjectForm;

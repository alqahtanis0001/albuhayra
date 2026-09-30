"use client";

/**
 * Settings › التذكيرات (v1.2c, C1): the daily digest switch and its hour.
 * `DigestSettingsSchema` runs here first and again in the action. The fields
 * are controlled so a refused submit keeps the owner's choice (React resets
 * uncontrolled fields after a form action). The hour select stays enabled while
 * the switch is off: a disabled field is not posted, and the hour is required.
 */
import { useActionState, useEffect, useState } from "react";

import { Button } from "@/components/Button";
import { FormToast } from "@/components/FormToast";
import { Select } from "@/components/Select";
import { Toast } from "@/components/Toast";
import { t } from "@/i18n/ar";
import { DigestSettingsSchema, invalid, type ActionResult } from "@/lib/validation";

type State = ActionResult<null> | null;
export type DigestSettingsAction = (prev: State, formData: FormData) => Promise<ActionResult<null>>;

/** 0–23 as «00:00» … «23:00», Western digits (Asia/Riyadh; the label says so). */
const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: `${String(h).padStart(2, "0")}:00`,
}));

export function DigestSettingsForm({
  action,
  initial,
}: {
  action: DigestSettingsAction;
  initial: { digestEnabled: boolean; digestHour: number };
}) {
  const [enabled, setEnabled] = useState(initial.digestEnabled);
  const [hour, setHour] = useState(String(initial.digestHour));
  const [done, setDone] = useState(false);

  const [state, formAction, pending] = useActionState(
    async (prev: State, formData: FormData): Promise<State> => {
      const parsed = DigestSettingsSchema.safeParse(Object.fromEntries(formData));
      if (!parsed.success) return invalid(parsed.error);
      return action(prev, formData);
    },
    null,
  );

  useEffect(() => {
    if (state?.ok) setDone(true);
  }, [state]);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-4" noValidate>
      <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3">
        <span className="text-sm font-medium text-gray-700">{t.reminderSettings.enabled}</span>
        <input
          type="checkbox"
          role="switch"
          name="digestEnabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="peer sr-only"
        />
        {/* The track; the knob sits at the inline start when off and moves to
            the end when on (a logical margin, so it runs right to left here). */}
        <span
          aria-hidden="true"
          className={`flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent motion-reduce:transition-none ${
            enabled ? "bg-accent" : "bg-gray-500"
          }`}
        >
          <span
            className={`size-5 rounded-full bg-white shadow-sm transition-[margin] duration-150 ease-out motion-reduce:transition-none ${
              enabled ? "ms-5.5" : "ms-0.5"
            }`}
          />
        </span>
      </label>

      <Select
        label={t.reminderSettings.hour}
        name="digestHour"
        options={HOURS}
        value={hour}
        onChange={(e) => setHour(e.target.value)}
        hint={t.reminderSettings.hourHelp}
        required
        error={fieldErrors?.digestHour}
      />

      <div>
        <Button type="submit" pending={pending}>
          {t.common.save}
        </Button>
      </div>

      <FormToast state={state} />
      {done ? (
        <Toast
          message={t.reminderSettings.saved}
          tone="success"
          onDismiss={() => setDone(false)}
        />
      ) : null}
    </form>
  );
}

export default DigestSettingsForm;

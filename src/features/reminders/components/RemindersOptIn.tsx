"use client";

/**
 * The party page's opt-in for client reminders (spec §4.2, C9). Off by
 * default; while off, no «تذكير» appears anywhere for this party. Saving is
 * immediate (the action audits it); the switch shows the server's value again
 * after a refresh, and snaps back if the action is refused.
 */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Switch } from "@/components/Switch";
import { Toast } from "@/components/Toast";
import { setPartyRemindersOptIn } from "@/features/reminders/client";
import { errorMessage, t } from "@/i18n/ar";

export function RemindersOptIn({ partyId, optIn }: { partyId: string; optIn: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(optIn);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (on: boolean) => {
    setChecked(on);
    start(async () => {
      const result = await setPartyRemindersOptIn(partyId, on);
      if (result.ok) router.refresh();
      else {
        setChecked(!on);
        setError(result.error);
      }
    });
  };

  return (
    <div className="no-print">
      <Switch
        label={t.clientReminder.optIn}
        checked={checked}
        onChange={toggle}
        disabled={pending}
        hint={t.clientReminder.optInHelp}
      />
      {error ? <Toast message={errorMessage(error)} onDismiss={() => setError(null)} /> : null}
    </div>
  );
}

export default RemindersOptIn;

import type { Metadata } from "next";

import { Card } from "@/components/Card";
import { DigestSettingsForm } from "@/features/reminders/components/DigestSettingsForm";
import { updateDigestSettings } from "@/features/reminders/actions";
import { getDigestSettings } from "@/features/reminders/settings";
import { t } from "@/i18n/ar";
import { requireOwner } from "@/lib/auth";

export const metadata: Metadata = { title: t.navItem.reminders };

/**
 * Settings › التذكيرات (spec §4.1, C1): the daily digest to the owner's login
 * email. `schedulerConfigured` is a boolean from the server — the secret itself
 * never reaches the page.
 */
export default async function ReminderSettingsPage() {
  const { establishmentId } = await requireOwner();
  const settings = await getDigestSettings(establishmentId);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-gray-900">{t.reminderSettings.title}</h1>

      <Card title={t.reminderSettings.digestTitle} bodyClassName="flex flex-col gap-4 p-4">
        <p className="text-sm text-gray-700">{t.reminderSettings.digestHelp}</p>

        {settings.ownerEmail ? (
          <p className="text-sm text-gray-700">
            {t.reminderSettings.sentTo}{" "}
            <bdi dir="ltr" className="font-medium text-gray-900">
              {settings.ownerEmail}
            </bdi>
          </p>
        ) : null}

        {settings.schedulerConfigured ? null : (
          <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            {t.reminderSettings.notConfigured}
          </p>
        )}

        <DigestSettingsForm
          action={updateDigestSettings}
          initial={{ digestEnabled: settings.digestEnabled, digestHour: settings.digestHour }}
        />
      </Card>
    </div>
  );
}

import { redirect } from "next/navigation";

import { settingsRedirectPath } from "@/features/settings/components/settingsPaths";
import { requireOwner } from "@/lib/auth";

/**
 * The settings tabs are pages since v1.2a; this keeps old /owner/settings?tab=…
 * links working by sending each to the page its tab became.
 */
export default async function OwnerSettingsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  redirect(settingsRedirectPath((await searchParams).tab));
}

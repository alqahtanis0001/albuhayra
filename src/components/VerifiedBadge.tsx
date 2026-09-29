import { t } from "@/i18n/ar";

import { Badge } from "./Badge";

/** «مُوثّق» / «غير مُوثّق» — whether the account's email is verified (v1.1e). */
export function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge tone="in">{t.status.verified}</Badge>
  ) : (
    <Badge tone="warn">{t.status.unverified}</Badge>
  );
}

export default VerifiedBadge;

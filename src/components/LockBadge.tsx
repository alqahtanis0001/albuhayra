import { t } from "@/i18n/ar";

import { Badge } from "./Badge";
import { LockIcon } from "./icons";

/** Marks a row or month whose entries can no longer be changed. */
export function LockBadge() {
  return (
    <Badge tone="neutral" icon={<LockIcon size={14} />}>
      {t.lock.badge}
    </Badge>
  );
}

export default LockBadge;

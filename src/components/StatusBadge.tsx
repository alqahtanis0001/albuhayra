import { t } from "@/i18n/ar";

import { Badge, type BadgeTone } from "./Badge";

export type UserStatusValue = "PENDING" | "ACTIVE" | "DISABLED";

const TONES: Record<UserStatusValue, BadgeTone> = {
  PENDING: "warn",
  ACTIVE: "in",
  DISABLED: "neutral",
};

export function StatusBadge({ status }: { status: UserStatusValue }) {
  return <Badge tone={TONES[status]}>{t.status[status]}</Badge>;
}

export default StatusBadge;

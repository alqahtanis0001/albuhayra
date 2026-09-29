/**
 * «قريباً» placeholder (v1.2a): the staff records and attendance pages exist in
 * the navigation now and arrive in v1.2b. A plain card in the theme — the pill
 * says the section is coming, the body says what it will hold — and an
 * optional link to where the owner can act today.
 */
import type { ReactNode } from "react";

import { t } from "@/i18n/ar";

import { Badge } from "./Badge";
import { Card } from "./Card";

export function ComingSoon({ body, action }: { body: string; action?: ReactNode }) {
  return (
    <Card>
      <div className="flex flex-col items-start gap-3">
        <Badge tone="accent">{t.comingSoon.badge}</Badge>
        <h2 className="text-base font-semibold text-gray-900">{t.comingSoon.title}</h2>
        <p className="text-sm text-gray-600">{body}</p>
        {action}
      </div>
    </Card>
  );
}

export default ComingSoon;

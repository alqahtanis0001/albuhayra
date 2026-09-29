"use client";

import { Button } from "@/components/Button";
import { t } from "@/i18n/ar";

/** The one thing on this page that needs the browser. */
export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {t.common.print}
    </Button>
  );
}

export default PrintButton;

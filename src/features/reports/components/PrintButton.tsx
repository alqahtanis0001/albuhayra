"use client";

import { Button } from "@/components/Button";
import { t } from "@/i18n/ar";

/** The one thing on this page that needs the browser. */
export function PrintButton({ label = t.common.print }: { label?: string }) {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}

export default PrintButton;

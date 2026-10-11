import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";

import { PaymentRecorded } from "./PaymentRecorded";

/**
 * v1.4 part 3 — D29 R4: the plan page's `?paid=` consumer keeps its sr-only
 * announcement and now also shows the visible «تم حفظ الحركة» toast, so a
 * scheduled and an open agreement both land like every other save.
 */
describe("PaymentRecorded (R4)", () => {
  const html = renderToStaticMarkup(createElement(PaymentRecorded, { message: "x" }));

  it("renders the sr-only status and the visible success toast", () => {
    expect(html).toMatch(/<p role="status" class="sr-only">/);
    expect(html).toContain(t.transaction.saved);
    expect(html).toMatch(/<div [^>]*role="status"[^>]*class="[^"]*\bbg-money-in-soft\b/);
  });
});

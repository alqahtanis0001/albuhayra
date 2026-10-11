import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { t } from "@/i18n/ar";
import { buildSchedule } from "@/lib/schedule";

import { effectiveFirstDate, ScheduleBuilder } from "./ScheduleBuilder";

/**
 * v1.4 part 3 — D29 R14: «تاريخ أول قسط» (default and minimum: the start
 * date) sits above «توليد» with «عدد الأقساط»; the generator starts on the
 * chosen date; the hint says every row stays editable.
 */
const render = (startDate = "2026-10-11") =>
  renderToStaticMarkup(createElement(ScheduleBuilder, { totalHalalas: 300000, startDate, rows: [], onRows: () => undefined, equalDisabled: false }));

describe("ScheduleBuilder — the first-date control (R14)", () => {
  it("renders the first-date field defaulting to the start date, min = start, detached from the form", () => {
    const html = render();
    const input = /<input [^>]*name="scheduleFirstDate"[^>]*>/.exec(html)?.[0] ?? "";
    expect(input).toMatch(/\bvalue="2026-10-11"/);
    expect(input).toMatch(/\bmin="2026-10-11"/);
    expect(input).toMatch(/\bform="__none"/);
    expect(input).toMatch(/\blang="ar-SA"/);
    expect(html).toContain(t.schedule.firstDate);
    expect(html).toContain(t.schedule.editHint);
    // Above «توليد»: the count and the date come before the button.
    expect(html.indexOf('name="scheduleCount"')).toBeLessThan(html.indexOf(`>${t.schedule.generate}</button>`));
    expect(html.indexOf('name="scheduleFirstDate"')).toBeLessThan(html.indexOf(`>${t.schedule.generate}</button>`));
    expect(html.indexOf(`>${t.schedule.generate}</button>`)).toBeLessThan(html.indexOf(t.schedule.editHint));
  });

  it("effectiveFirstDate: the chosen date, or the start when empty or earlier", () => {
    expect(effectiveFirstDate("2026-11-01", "2026-10-11")).toBe("2026-11-01");
    expect(effectiveFirstDate("2026-10-11", "2026-10-11")).toBe("2026-10-11");
    expect(effectiveFirstDate("2026-10-01", "2026-10-11")).toBe("2026-10-11");
    expect(effectiveFirstDate("", "2026-10-11")).toBe("2026-10-11");
  });

  it("the generator is fed the chosen first date, not the start date (static), and rows start on it", () => {
    const source = readFileSync("src/features/plans/components/ScheduleBuilder.tsx", "utf8");
    expect(source).toMatch(/firstDueDate: first,/);
    expect(source).not.toMatch(/firstDueDate: startDate/);
    const rows = buildSchedule({ totalHalalas: 300000, count: 3, frequency: "MONTHLY", firstDueDate: effectiveFirstDate("2026-11-01", "2026-10-11") })!;
    expect(rows[0]!.dueDate).toBe("2026-11-01");
  });
});

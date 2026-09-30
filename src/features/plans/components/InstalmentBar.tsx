/**
 * v1.3 item 7 — the segmented instalment bar. A **server** component (lead
 * ruling B4: PlanBits and its ~12 importers stay server-safe): one equal-width
 * segment per instalment, coloured from its server-derived status — paid green,
 * partial half green, overdue red, due amber, upcoming grey. Hidden in print;
 * the «سُدّد X من N» line beside it stays the text equivalent.
 *
 * - `InstalmentBar` (list cards): decorative, aria-hidden, not focusable.
 * - `InstalmentBarDetail` (plan header): each segment is focusable and shows
 *   name — amount — status on hover or focus through a CSS-only popover.
 */
import { MoneyText } from "@/components/MoneyText";
import { fillTemplate } from "@/components/fillTemplate";
import { PALETTE } from "@/components/visualPalette";
import { t } from "@/i18n/ar";
import type { InstalmentStatus } from "@/lib/instalments";
import { formatSAR } from "@/lib/money";

import { InstalmentName, periodLabel } from "./PlanBits";
import { hasGap, popoverEdge, segmentState, type SegmentTone } from "./instalmentSegments";

const TONE: Record<SegmentTone, string> = {
  in: PALETTE.in,
  out: PALETTE.out,
  amber: PALETTE.amber,
  grey: PALETTE.grey,
};

const STATUSES: InstalmentStatus[] = ["PAID", "PARTIAL", "DUE", "OVERDUE", "UPCOMING"];

/** A segment's track (grey-soft) with its fill from the inline start. */
function Segment({ status, grow = false }: { status: InstalmentStatus; grow?: boolean }) {
  const { tone, fill } = segmentState(status);
  return (
    <span className="relative block h-2.5 w-full overflow-hidden bg-gray-200">
      <span
        className={`absolute inset-y-0 start-0 ${grow ? "v13-grow-inline" : ""}`}
        style={{ width: `${fill * 100}%`, backgroundColor: TONE[tone] }}
      />
    </span>
  );
}

/** List cards: decorative only — the sr-only text line carries the progress. */
export function InstalmentBar({ statuses }: { statuses: InstalmentStatus[] }) {
  if (statuses.length === 0) return null;
  return (
    <div aria-hidden="true" className={`no-print flex ${hasGap(statuses.length) ? "gap-px" : ""}`}>
      {statuses.map((status, i) => (
        <span key={i} className="min-w-0 flex-1">
          <Segment status={status} />
        </span>
      ))}
    </div>
  );
}

export type BarInstalment = {
  id: string;
  seq: number;
  periodYm: string | null;
  amountDueHalalas: number;
  status: InstalmentStatus;
};

function segmentLabel(row: BarInstalment): string {
  const name = row.periodYm ? periodLabel(row.periodYm) : `${t.schedule.row} ${row.seq}`;
  return t.planBar.segment
    .replace("{name}", name)
    .replace("{amount}", formatSAR(row.amountDueHalalas))
    .replace("{status}", t.instalmentStatus[row.status]);
}

/**
 * The plan header's bar. `paidId` (from `?paid=`) grows that segment's fill in
 * (item 8); an id that matches no row is simply ignored.
 */
export function InstalmentBarDetail({
  instalments,
  paidId,
}: {
  instalments: BarInstalment[];
  paidId?: string;
}) {
  const count = instalments.length;
  if (count === 0) return null;
  return (
    <div className="no-print flex flex-col gap-2">
      <ol aria-label={t.planBar.label} className={`flex pt-1 ${hasGap(count) ? "gap-px" : ""}`}>
        {instalments.map((row, i) => (
          <li key={row.id} className="group relative min-w-0 flex-1">
            <span
              role="img"
              tabIndex={0}
              aria-label={segmentLabel(row)}
              className="block cursor-default py-1 outline-offset-2"
            >
              <Segment status={row.status} grow={row.id === paidId} />
            </span>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-sm border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 opacity-0 shadow-sm group-focus-within:opacity-100 group-hover:opacity-100 ${
                popoverEdge(i, count) === "start" ? "start-0" : "end-0"
              }`}
            >
              {fillTemplate(t.planBar.segment, {
                name: <InstalmentName seq={row.seq} periodYm={row.periodYm} />,
                amount: <MoneyText halalas={row.amountDueHalalas} />,
                status: t.instalmentStatus[row.status],
              })}
            </span>
          </li>
        ))}
      </ol>
      <BarLegend />
    </div>
  );
}

/** Swatch + word for each status; the words are the badges' words. */
function BarLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700">
      {STATUSES.map((status) => (
        <li key={status} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="w-4">
            <Segment status={status} />
          </span>
          {t.instalmentStatus[status]}
        </li>
      ))}
    </ul>
  );
}

export default InstalmentBar;

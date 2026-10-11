/**
 * v1.4 C3 — the open agreement's plain progress bar (hand-written, no chart
 * library): green, gold from 80 %, full at 100 %. A **server** component.
 * `role="progressbar"` with the percentage as its value and an aria-label
 * worded for the direction (P12); the percentage is also written beside it,
 * so colour is never the only signal. `.v13-grow-inline` grows the fill in on
 * the detail page; static under reduced motion (globals.css). Hidden in print.
 */
import { PALETTE } from "@/components/visualPalette";
import { t } from "@/i18n/ar";
import type { DirectionValue } from "@/lib/validation";

import { progressOf, type ProgressTone } from "./openPlanView";

const TONE: Record<ProgressTone, string> = { green: PALETTE.in, gold: PALETTE.gold, full: PALETTE.greenDark };

export function OpenProgress({
  receivedHalalas,
  totalHalalas,
  direction,
  grow = false,
}: {
  receivedHalalas: number;
  totalHalalas: number | null;
  direction: DirectionValue;
  grow?: boolean;
}) {
  const progress = progressOf(receivedHalalas, totalHalalas);
  if (!progress) return null;
  const pctText = `${progress.pct}%`;
  const label = (direction === "IN" ? t.openPlan.progressLabel : t.openPlan.progressLabelOut).replace("{pct}", pctText);
  return (
    <div className="no-print flex items-center gap-3">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.pct}
        aria-label={label}
        className="relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200"
      >
        <span
          className={`absolute inset-y-0 start-0 rounded-full ${grow ? "v13-grow-inline" : ""}`}
          style={{ width: pctText, backgroundColor: TONE[progress.tone] }}
        />
      </div>
      <span className="text-xs text-gray-700" aria-hidden="true">
        <bdi dir="ltr" className="tabular-nums">{pctText}</bdi>
      </span>
    </div>
  );
}

export default OpenProgress;

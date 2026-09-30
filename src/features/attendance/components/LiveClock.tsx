"use client";

/**
 * v1.3 item 11: the live clock inside «حضوري». It starts from the server's
 * instant at render and advances by the phone's elapsed time — one 1 s
 * interval, the one loop the spec allows; nothing is fetched. The ring shows
 * the time left before a check-in would be late (clockMath.graceLeft), with
 * the words always beside it. The clock is information, so it keeps ticking
 * under reduced motion; only the ring's transition stops. Not aria-live: a
 * screen reader would announce every second.
 *
 * Back/forward can replay a cached server payload, so `serverNowMs` may be
 * minutes old: when it is more than a minute behind the phone at mount, the
 * page is refreshed once (a server re-render, not a client fetch) to take a
 * fresh server instant. Once per mount, so it cannot loop.
 */
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PALETTE } from "@/components/visualPalette";
import { plural } from "@/lib/plural";
import { t } from "@/i18n/ar";

import { formatClock, graceLeft, ringDash } from "./clockMath";

export type ClockRing =
  | { kind: "grace"; workStart: string; graceMinutes: number }
  | { kind: "checked"; at: string }
  | { kind: "none"; note: boolean };

const TONE = { green: PALETTE.green, amber: PALETTE.amber, red: PALETTE.out } as const;
const R = 52;
const STALE_MS = 60_000;

export function LiveClock({ serverNowMs, ring }: { serverNowMs: number; ring: ClockRing }) {
  const router = useRouter();
  const refreshed = useRef(false);
  const [now, setNow] = useState(serverNowMs);
  // Mount only (the ref also covers Strict Mode's double run): a refreshed
  // payload must not trigger another refresh.
  useEffect(() => {
    if (refreshed.current) return;
    refreshed.current = true;
    if (Date.now() - serverNowMs > STALE_MS) router.refresh();
  }, []);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setNow(serverNowMs + (Date.now() - started)), 1000);
    return () => clearInterval(id);
  }, [serverNowMs]);

  const time = (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-600">{t.liveClock.now}</span>
      <bdi dir="ltr" className="text-2xl font-semibold tabular-nums text-gray-900">
        <time dateTime={formatClock(now)}>{formatClock(now)}</time>
      </bdi>
    </div>
  );

  if (ring.kind === "none") {
    return (
      <div className="flex flex-col items-center gap-1 py-2">
        {time}
        {ring.note ? <p className="text-center text-sm text-gray-600">{t.liveClock.noStart}</p> : null}
      </div>
    );
  }

  const g = ring.kind === "grace" ? graceLeft(now, ring.workStart, ring.graceMinutes) : null;
  // Late: the whole ring turns red (the words say it too).
  const fraction = !g || g.late ? 1 : g.fraction;
  const colour = g ? TONE[g.tone] : PALETTE.green;
  const words = !g
    ? null
    : g.late
      ? t.liveClock.late
      : g.minutes === 0
        ? t.liveClock.lessThanMinute
        : plural(t.liveClock.timeLeft, g.minutes);
  const [before, after] = t.liveClock.checkedIn.split("{time}");

  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative size-36">
        <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true" focusable="false">
          <circle cx="60" cy="60" r={R} fill="none" stroke={PALETTE.greySoft} strokeWidth="8" />
          {fraction > 0 ? (
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={colour}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ringDash(fraction, R)}
              transform="rotate(-90 60 60)"
              className="motion-safe:transition-[stroke-dasharray,stroke] motion-safe:duration-700 motion-safe:ease-out"
            />
          ) : null}
          {ring.kind === "checked" ? (
            <path d="M47 30l9 9 17-17" fill="none" stroke={PALETTE.green} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">{time}</div>
      </div>
      <p className={`text-center text-sm font-medium ${g?.late ? "text-money-out" : "text-gray-900"}`}>
        {ring.kind === "checked" ? (
          <>
            {before}
            <bdi dir="ltr" className="tabular-nums">
              {ring.at}
            </bdi>
            {after}
          </>
        ) : (
          <>
            <span className="sr-only">{t.liveClock.ringLabel}: </span>
            {words}
          </>
        )}
      </p>
    </div>
  );
}

export default LiveClock;

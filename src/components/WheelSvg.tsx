"use client";

/**
 * v1.5 (docs/V15-SPEC.md A1, D5, D6, D16, D18, D27, D28, D30): the overview
 * wheel's SVG — three rings, the 30-day dial and the centre — drawn from the
 * server-built `WheelModel`. No state here: `WheelCard` owns the focus, the
 * roving cursor and the replay key. Segments and dots are `<g role="button">`
 * with a halo drawn in the SVG on `:focus-visible` (Safari draws no outline on
 * SVG). Animation is CSS only (keyframes in globals.css); the resting state of
 * every element is the final frame, so print, no-JS and reduced motion show
 * the finished wheel. Colours are tokens only (C4).
 */
import type { KeyboardEvent } from "react";

import { t } from "@/i18n/ar";
import { BADGE_ANGLE, CENTRE, CENTRE_R, DIAL_R, HIT_RADIUS, VIEWBOX, arcPath, dayAngle, polar } from "@/features/dashboard/wheel";
import type { CentreText, Focus, Layer } from "@/features/dashboard/wheelFocus";
import { layerOpacity } from "@/features/dashboard/wheelFocus";
import { TONE_VAR, type Tone, type WheelDot, type WheelModel, type WheelRing } from "@/features/dashboard/wheelModel";

export { TONE_VAR };
export const TRACK = "var(--color-track)";
export const FOCUS = "var(--focus-ring, var(--color-accent))";

/** D6 timings: ring n starts at 0 / 0.8 / 1.6 s, the dial at 2.4 s, each segment +0.12 s. */
export const LAYER_DELAY: Record<Layer, number> = { 1: 0, 2: 0.8, 3: 1.6, 4: 2.4 };
export const SEGMENT_STEP = 0.12;

const DRAW = "motion-safe:animate-[wheel-draw_0.7s_cubic-bezier(0.4,0,0.2,1)_backwards] print:animate-none";
const POP = "motion-safe:animate-[wheel-pop_0.35s_ease-out_backwards] print:animate-none";
const LAYER = "transition-opacity duration-200 print:!opacity-100";
const MARK = "group cursor-pointer outline-none focus:outline-none";

export type MarkHandlers = {
  tabIndexOf: (id: string) => 0 | -1;
  onActivate: (id: string, ring: Layer, href: string) => void;
  onKeyDown: (e: KeyboardEvent<SVGGElement>, id: string, ring: Layer, href: string) => void;
  refOf: (id: string) => (el: SVGGElement | null) => void;
};

/** An inline animation delay, rounded to centiseconds (no float noise in the markup). */
export function delay(seconds: number, animate: boolean) {
  return animate ? { animationDelay: `${Math.round(seconds * 100) / 100}s` } : undefined;
}

function Ring({ ring, animate, h }: { ring: WheelRing; animate: boolean; h: MarkHandlers }) {
  if (ring.segments.length === 0) {
    return <circle cx={CENTRE} cy={CENTRE} r={ring.r} fill="none" strokeWidth={ring.w} style={{ stroke: TRACK }} />;
  }
  return (
    <>
      {ring.segments.map((s, i) => {
        const d = arcPath(ring.r, s.a0, s.a1);
        return (
          <g
            key={s.id}
            ref={h.refOf(s.id)}
            role="button"
            tabIndex={h.tabIndexOf(s.id)}
            aria-label={s.aria}
            className={MARK}
            onClick={() => h.onActivate(s.id, s.ring, s.href)}
            onKeyDown={(e) => h.onKeyDown(e, s.id, s.ring, s.href)}
          >
            <path d={d} fill="none" strokeWidth={ring.w + 6} className="invisible group-focus-visible:visible" style={{ stroke: FOCUS }} />
            <path
              d={d}
              fill="none"
              strokeWidth={ring.w}
              pathLength={1}
              className={animate ? DRAW : undefined}
              style={{ stroke: s.colour, strokeDasharray: 1, ...delay(LAYER_DELAY[s.ring] + i * SEGMENT_STEP, animate) }}
            />
          </g>
        );
      })}
    </>
  );
}

function Dot({ dot, i, animate, h }: { dot: WheelDot; i: number; animate: boolean; h: MarkHandlers }) {
  const tone: Tone = dot.overdue ? "red" : dot.kind === "IN" ? "green" : dot.kind === "OUT" ? "red" : "gold";
  const colour = TONE_VAR[tone];
  return (
    <g
      ref={h.refOf(dot.id)}
      role="button"
      tabIndex={h.tabIndexOf(dot.id)}
      aria-label={dot.aria}
      className={MARK}
      onClick={() => h.onActivate(dot.id, 4, dot.href)}
      onKeyDown={(e) => h.onKeyDown(e, dot.id, 4, dot.href)}
    >
      <circle cx={dot.cx} cy={dot.cy} r={dot.r + 4} fill="none" strokeWidth={2} className="invisible group-focus-visible:visible" style={{ stroke: FOCUS }} />
      <g
        className={animate ? POP : undefined}
        style={{ transformBox: "fill-box", transformOrigin: "center", ...delay(LAYER_DELAY[4] + 0.7 + i * SEGMENT_STEP, animate) }}
      >
        <circle
          cx={dot.cx}
          cy={dot.cy}
          r={dot.r}
          className={dot.overdue ? "fill-white" : undefined}
          style={dot.overdue ? { stroke: colour, strokeWidth: 2 } : { fill: colour }}
        />
        {dot.count > 1 && dot.r >= COUNT_MIN_R ? (
          <text x={dot.cx} y={dot.cy + 3} textAnchor="middle" fontSize={9} fontWeight={700} className={countInk(dot, tone)}>
            {dot.count}
          </text>
        ) : null}
      </g>
      {/* D3: the invisible hit circle sits on top of the visible dot. */}
      <circle cx={dot.cx} cy={dot.cy} r={HIT_RADIUS} fill="transparent" />
    </g>
  );
}

/** D40 (R1-H3): a count is drawn only on a dot that can hold it; the aria-label and the live line always carry it. */
export const COUNT_MIN_R = 7;

/** Ink on the dot's own fill: dark on gold in both themes (`on-gold`), on-accent on green/red, red on a hollow dot. */
export function countInk(dot: Pick<WheelDot, "overdue">, tone: Tone): string {
  if (dot.overdue) return "fill-money-out";
  return tone === "gold" ? "fill-on-gold" : "fill-on-accent";
}

function Centre({ text, tone }: { text: CentreText; tone: string }) {
  if (!text.amount) {
    return (
      <text x={CENTRE} y={CENTRE + 4} textAnchor="middle" fontSize={13} fontWeight={600} className="fill-gray-500">
        {text.shortLabel}
      </text>
    );
  }
  return (
    <g aria-hidden="true">
      <text x={CENTRE} y={CENTRE - 22} textAnchor="middle" fontSize={11} className="fill-gray-500">
        {text.shortLabel}
      </text>
      {/* An amount reads left to right; a count with a word («3 مواعيد») keeps the page's RTL (D40). */}
      <text
        x={CENTRE}
        y={CENTRE + 4}
        textAnchor="middle"
        fontSize={text.currency ? 24 : 18}
        fontWeight={700}
        direction={text.currency ? "ltr" : undefined}
        className="fill-gray-900"
      >
        {text.amount}
      </text>
      {text.currency ? (
        <text x={CENTRE} y={CENTRE + 22} textAnchor="middle" fontSize={11} className="fill-gray-500">
          {t.common.currency}
        </text>
      ) : null}
      {text.sub ? (
        <text x={CENTRE} y={CENTRE + 40} textAnchor="middle" fontSize={10.5} fontWeight={600} className={tone}>
          {text.sub}
        </text>
      ) : null}
    </g>
  );
}

export function WheelSvg({
  model,
  focused,
  centre,
  centreTone,
  animate,
  handlers,
}: {
  model: WheelModel;
  focused: Focus | null;
  centre: CentreText;
  centreTone: string;
  animate: boolean;
  handlers: MarkHandlers;
}) {
  const [tx, ty] = polar(DIAL_R, 0).map((v) => Math.round(v * 10) / 10) as [number, number];
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      role="group"
      aria-label={t.wheel.aria}
      className="mx-auto block h-auto w-full max-w-[360px]"
    >
      {model.rings.map((ring) => (
        <g key={ring.ring} className={LAYER} style={{ opacity: layerOpacity(focused, ring.ring) }}>
          <Ring ring={ring} animate={animate} h={handlers} />
        </g>
      ))}
      {model.rings.map((ring) => {
        const [bx, by] = polar(ring.r, BADGE_ANGLE).map((v) => Math.round(v * 10) / 10) as [number, number];
        return (
          <g key={`b${ring.ring}`} aria-hidden="true" className={animate ? POP : undefined} style={{ transformBox: "fill-box", transformOrigin: "center", ...delay(LAYER_DELAY[ring.ring] + 0.6, animate) }}>
            <circle cx={bx} cy={by} r={9} className="fill-white stroke-gray-200" />
            <text x={bx} y={by + 4} textAnchor="middle" fontSize={10} fontWeight={700} className="fill-gray-900">
              {ring.ring}
            </text>
          </g>
        );
      })}
      <g className={LAYER} style={{ opacity: layerOpacity(focused, 4) }}>
        <circle
          cx={CENTRE}
          cy={CENTRE}
          r={DIAL_R}
          fill="none"
          strokeWidth={4}
          pathLength={1}
          transform={`rotate(-90 ${CENTRE} ${CENTRE})`}
          className={animate ? DRAW : undefined}
          style={{ stroke: TRACK, strokeDasharray: 1, ...delay(LAYER_DELAY[4], animate) }}
        />
        <g aria-hidden="true" className={animate ? POP : undefined} style={{ transformBox: "fill-box", transformOrigin: "center", ...delay(LAYER_DELAY[4] + 0.5, animate) }}>
          {Array.from({ length: 30 }, (_, d) => {
            const [x0, y0] = polar(DIAL_R + 3, dayAngle(d));
            const [x1, y1] = polar(d % 5 ? DIAL_R + 5 : DIAL_R + 8, dayAngle(d));
            const at = (v: number) => Math.round(v * 10) / 10;
            return <line key={d} x1={at(x0)} y1={at(y0)} x2={at(x1)} y2={at(y1)} strokeWidth={1} className="stroke-gray-300" />;
          })}
        </g>
        <g aria-hidden="true" className={animate ? POP : undefined} style={{ transformBox: "fill-box", transformOrigin: "center", ...delay(LAYER_DELAY[4] + 0.6, animate) }}>
          <circle cx={tx} cy={ty} r={5} className="fill-gray-900" />
          <text x={tx} y={ty - 12} textAnchor="middle" fontSize={9} className="fill-gray-500">
            {t.wheel.today}
          </text>
        </g>
        {model.dots.map((dot, i) => (
          <Dot key={dot.id} dot={dot} i={i} animate={animate} h={handlers} />
        ))}
      </g>
      <circle cx={CENTRE} cy={CENTRE} r={CENTRE_R} className="fill-white" />
      <Centre text={centre} tone={centreTone} />
    </svg>
  );
}

export default WheelSvg;

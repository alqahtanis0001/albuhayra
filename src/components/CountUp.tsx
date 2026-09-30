"use client";

/**
 * v1.3 (docs/V13-SPEC.md item 1): a stat card's amount counts up from 0 over
 * 600 ms, ease-out, once. The server renders the final value, so no-JS and
 * print show it; under reduced motion (and before hydration, where
 * `useReducedMotion` is true) nothing moves. Screen readers get only the final
 * value: the moving digits are aria-hidden and the final one is sr-only. The
 * sign and colour are `MoneyText`'s, unchanged. Started in a layout effect, so
 * after a client navigation the 0 is painted first; on a hard load the final
 * value can show for a frame before hydration (accepted, lead ruling).
 */
import { useLayoutEffect, useState } from "react";

import { countUpValue } from "@/features/dashboard/visuals";

import { MoneyText, type MoneyTextProps } from "./MoneyText";
import { useReducedMotion } from "./useReducedMotion";

const DURATION_MS = 600;

export function CountUp(props: Omit<MoneyTextProps, "className">) {
  const { halalas } = props;
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(halalas);

  useLayoutEffect(() => {
    if (reduced || halalas === 0) {
      setShown(halalas);
      return;
    }
    let frame = 0;
    let start: number | null = null;
    setShown(0);
    const tick = (now: number) => {
      start ??= now;
      const value = countUpValue(halalas, now - start, DURATION_MS);
      setShown(value);
      if (value !== halalas) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setShown(halalas);
    };
  }, [halalas, reduced]);

  return (
    <>
      <span aria-hidden="true">
        <MoneyText {...props} halalas={shown} />
      </span>
      <span className="sr-only">
        <MoneyText {...props} />
      </span>
    </>
  );
}

export default CountUp;

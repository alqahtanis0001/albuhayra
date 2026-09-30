"use client";

import { useEffect, useState } from "react";

/** The row wash (`.v13-paid`) runs 800 ms; the param goes once it has played. */
const HIGHLIGHT_MS = 800;

/**
 * v1.3 item 8 — rendered by the plan page only when `?paid=` names one of its
 * instalments. Announces the payment once, then drops `?paid` from the address
 * with `history.replaceState` (lead ruling B1: no router call, no refetch, no
 * skeleton), so a reload or a shared link does not replay the highlight. Under
 * reduced motion the param goes at once; the static wash stays on screen until
 * the next navigation.
 */
export function PaymentRecorded({ message }: { message: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setText(message));
    const clear = () => window.history.replaceState(null, "", window.location.pathname);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(clear, reduce ? 0 : HIGHLIGHT_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [message]);

  return (
    <p role="status" className="sr-only">
      {text}
    </p>
  );
}

export default PaymentRecorded;

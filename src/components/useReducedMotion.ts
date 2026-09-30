"use client";

import { useSyncExternalStore } from "react";

/**
 * v1.3 (docs/V13-SPEC.md): for the few animations CSS cannot do alone (the
 * count-up, the payment highlight's param clean-up). True on the server and
 * before hydration, so the first paint is always the static final state.
 */
const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const mql = matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => true,
  );
}

export default useReducedMotion;

"use client";

/**
 * Navigation feedback (docs/FRONTEND.md, Transitions v1.1c). A nav link knows
 * when its own navigation is pending (`useLinkStatus`), but it sits inside the
 * side nav's sticky list, a stacking context under the z-30 top bar — a bar
 * drawn there would be hidden on desktop. So each link reports into a small
 * context, and one bar mounted at AppShell's root (outside the nav and #main)
 * draws it. The App Router has no navigation-start event, so there is no other
 * source that avoids onClick state.
 *
 * The bar is presentation only: aria-hidden, no-print, and the delay, colour
 * and motion live in globals.css (.nav-progress).
 */
import { useLinkStatus } from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/** Registers one pending navigation; the returned function releases it. */
type Track = () => () => void;

const TrackContext = createContext<Track>(() => () => {});
const PendingContext = createContext(false);

export function NavProgressProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const track = useCallback<Track>(() => {
    setCount((c) => c + 1);
    return () => setCount((c) => c - 1);
  }, []);

  return (
    <TrackContext.Provider value={track}>
      <PendingContext.Provider value={count > 0}>{children}</PendingContext.Provider>
    </TrackContext.Provider>
  );
}

/** The thin bar at the top edge, over the top bar's dark strip. */
export function NavProgress() {
  const pending = useContext(PendingContext);
  return (
    <div
      aria-hidden="true"
      className="nav-progress no-print"
      data-active={pending ? "" : undefined}
    />
  );
}

/**
 * Goes inside a nav `<Link>`. Reports that link's pending state to the bar and
 * exposes it as `data-pending` so the link can style itself with
 * `has-data-pending:`. Releasing in the effect cleanup matters: a link that
 * unmounts while pending must not leave the bar on.
 */
export function LinkPending() {
  const { pending } = useLinkStatus();
  const track = useContext(TrackContext);

  useEffect(() => {
    if (!pending) return;
    return track();
  }, [pending, track]);

  return <span hidden data-pending={pending ? "" : undefined} />;
}

export default NavProgress;

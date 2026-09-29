"use client";

/**
 * The one button. Press feedback (docs/FRONTEND.md, Motion v1.1d): a 0.97 press
 * scale over 80 ms, a darker hover, the global focus ring, and on `primary` a
 * ripple that starts where the pointer went down.
 *
 * Pending: an explicit `pending` prop wins (forms that track their own
 * `useActionState` / `useTransition` pass it). Without it, a `type="submit"`
 * button reads its form's status with `useFormStatus`, so every form backed by
 * a server action shows the spinner and disables its submit button with no
 * wiring. `useFormStatus` stays false for plain GET forms (the ledger filters,
 * the report range), which navigate rather than save.
 */
import {
  useState,
  type ButtonHTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import { t } from "@/i18n/ar";

import { SpinnerIcon } from "./icons";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Disables the button and swaps the label for a spinner + `pendingLabel`. */
  pending?: boolean;
  pendingLabel?: string;
  block?: boolean;
  children: ReactNode;
};

// Hover is one step darker than rest on every variant; every pair keeps text
// contrast ≥ 4.5:1 (white on #004d26 10:1, gray-900 on gray-200 13:1,
// accent-dark on accent-line 5.8:1, white on red-800 8.3:1).
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white border-accent hover:bg-accent-dark hover:border-accent-dark disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-600",
  secondary:
    "bg-white text-gray-900 border-gray-300 hover:bg-gray-200 hover:border-gray-400 disabled:bg-gray-100 disabled:text-gray-500",
  danger:
    "bg-money-out text-white border-money-out hover:bg-red-800 hover:border-red-800 disabled:bg-gray-200 disabled:border-gray-300 disabled:text-gray-600",
  ghost:
    "bg-transparent text-accent-dark border-transparent hover:bg-accent-line disabled:text-gray-500",
};

// 44px minimum tap target on both sizes (docs/FRONTEND.md).
const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  sm: "min-h-11 px-3 text-sm",
};

type Ripple = { id: number; offset: number; top: number; size: number };

export function Button({
  variant = "primary",
  size = "md",
  pending,
  pendingLabel = t.common.saving,
  block = false,
  className = "",
  children,
  disabled,
  type = "button",
  onPointerDown,
  ...rest
}: ButtonProps) {
  const form = useFormStatus();
  const busy = pending ?? (type === "submit" && form.pending);
  const [ripples, setRipples] = useState<Ripple[]>([]);

  function ripple(event: PointerEvent<HTMLButtonElement>) {
    onPointerDown?.(event);
    if (variant !== "primary" || event.button !== 0) return;
    // Checked here rather than hidden in CSS: a hidden ripple never fires
    // animationend, so it would never be removed from state.
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Pointer coordinates are physical; the ripple is placed with a logical
    // inset, so convert to an offset from the inline-start edge.
    const box = event.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const offset = rtl ? box.right - event.clientX : event.clientX - box.left;
    setRipples((list) => [
      ...list,
      {
        id: event.timeStamp,
        offset,
        top: event.clientY - box.top,
        size: Math.max(box.width, box.height) * 2,
      },
    ]);
  }

  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      onPointerDown={ripple}
      className={[
        "relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-lg border font-medium",
        "transition-[scale,background-color,border-color] duration-[80ms] ease-out enabled:active:scale-[0.97]",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        block ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="btn-ripple"
          style={{
            insetInlineStart: r.offset - r.size / 2,
            top: r.top - r.size / 2,
            width: r.size,
            height: r.size,
          }}
          onAnimationEnd={() =>
            setRipples((list) => list.filter((x) => x.id !== r.id))
          }
        />
      ))}
      {busy ? (
        <>
          <SpinnerIcon size={18} className="motion-safe:animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { t } from "@/i18n/ar";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /** Disables the button and swaps the label for "جارٍ الحفظ…". */
  pending?: boolean;
  pendingLabel?: string;
  block?: boolean;
  children: ReactNode;
};

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent text-white border-accent hover:bg-accent-dark disabled:bg-gray-300 disabled:border-gray-300",
  secondary:
    "bg-white text-gray-900 border-gray-300 hover:bg-gray-50 disabled:text-gray-400",
  danger:
    "bg-money-out text-white border-money-out hover:bg-red-800 disabled:bg-gray-300 disabled:border-gray-300",
  ghost:
    "bg-transparent text-accent border-transparent hover:bg-accent-soft disabled:text-gray-400",
};

// 44px minimum tap target on both sizes (docs/FRONTEND.md).
const SIZES: Record<Size, string> = {
  md: "min-h-11 px-4 text-base",
  sm: "min-h-11 px-3 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  pending = false,
  pendingLabel = t.common.saving,
  block = false,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-lg border font-medium",
        "transition-none disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        block ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export default Button;

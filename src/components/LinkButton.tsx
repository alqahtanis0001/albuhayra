/**
 * A navigation link that looks like a Button (v1.2a pages: «إضافة جهة»,
 * «تسجيل تكلفة», «حسابات الدخول»…). Navigation is a link, not a button, so it
 * is a real <a>: middle-click, open in new tab and the prefetch all work. Same
 * shape, colours and 0.97 press as Button (Motion v1.1d); no ripple, which
 * needs client code.
 */
import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-white border-accent hover:bg-accent-dark hover:border-accent-dark",
  secondary: "bg-white text-gray-900 border-gray-300 hover:bg-gray-200 hover:border-gray-400",
};

export function LinkButton({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-4 font-medium transition-[scale,background-color,border-color] duration-[80ms] ease-out active:scale-[0.97] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export default LinkButton;

import type { ReactNode } from "react";

export type CardProps = {
  title?: string;
  /** Rendered at the end of the header row, e.g. a small link or button. */
  action?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
};

export function Card({
  title,
  action,
  className = "",
  bodyClassName = "p-4",
  children,
}: CardProps) {
  return (
    <section
      className={["rounded-xl border border-gray-200 bg-white", className]
        .filter(Boolean)
        .join(" ")}
    >
      {title || action ? (
        <header className="flex items-center justify-between gap-2 border-b border-gray-200 px-4 py-3">
          {title ? (
            <h2 className="text-start text-base font-semibold text-gray-900">{title}</h2>
          ) : (
            <span />
          )}
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export default Card;

import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  hint?: string;
  /** Usually a link styled as a primary button. */
  action?: ReactNode;
};

export function EmptyState({ title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <p className="text-base font-medium text-gray-900">{title}</p>
      {hint ? <p className="text-sm text-gray-500">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;

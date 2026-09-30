import type { ReactNode } from "react";

import { ILLUSTRATIONS, type IllustrationKind } from "@/components/illustrations";

export type EmptyStateProps = {
  title: string;
  hint?: string;
  /** Usually a link styled as a primary button. */
  action?: ReactNode;
  /** v1.3: a decorative line drawing above the title (unfiltered empty states only). */
  kind?: IllustrationKind;
};

export function EmptyState({ title, hint, action, kind }: EmptyStateProps) {
  const Art = kind ? ILLUSTRATIONS[kind] : null;
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      {Art ? <Art /> : null}
      <p className="text-base font-medium text-gray-900">{title}</p>
      {hint ? <p className="text-sm text-gray-500">{hint}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export default EmptyState;

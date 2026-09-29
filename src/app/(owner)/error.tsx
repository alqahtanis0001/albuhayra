"use client";

import { Button } from "@/components/Button";
import { t } from "@/i18n/ar";

/**
 * A render error under the owner layout, which stays around it. Shows no
 * error.message, stack or digest (docs/FRONTEND.md) — the server log has them.
 * `retry` (Next 16.3, error.md) re-fetches and re-renders the segment, so a
 * passing server-side failure can recover; `reset` would only re-render.
 */
export default function OwnerError({ retry }: { retry: () => void }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 text-start">
      <div role="alert">
        <h1 className="text-xl font-semibold text-gray-900">{t.errorPage.title}</h1>
        <p className="mt-2 text-sm text-gray-600">{t.errorPage.body}</p>
      </div>
      <Button className="mt-4" onClick={() => retry()}>
        {t.errorPage.retry}
      </Button>
    </section>
  );
}

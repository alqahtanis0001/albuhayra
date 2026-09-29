"use client";

import { Button } from "@/components/Button";
import { t } from "@/i18n/ar";

/**
 * A render error in a group layout itself (the per-group error.tsx files sit
 * inside their layouts and cannot catch it), so there is no chrome here. Shows
 * no error.message, stack or digest (docs/FRONTEND.md). `retry` (Next 16.3,
 * error.md) re-fetches and re-renders; `reset` would only re-render.
 */
export default function RootError({ retry }: { retry: () => void }) {
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center p-4">
      <section className="w-full max-w-md rounded-lg border border-t-4 border-gray-300 border-t-accent bg-white p-5 text-start">
        <div role="alert">
          <h1 className="text-lg font-bold text-gray-900">{t.errorPage.title}</h1>
          <p className="mt-2 text-sm text-gray-600">{t.errorPage.body}</p>
        </div>
        <Button className="mt-4" onClick={() => retry()}>
          {t.errorPage.retry}
        </Button>
      </section>
    </main>
  );
}

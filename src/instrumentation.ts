/**
 * Next.js calls register() once per server instance at start-up. It starts the
 * in-process keep-alive and reminder scheduler (src/lib/keepAlive.ts) only in
 * the Node.js runtime of a production server — never in the edge runtime,
 * never while `next build` collects pages, never under `next dev`.
 * startKeepAlive() is itself idempotent and a no-op without RENDER_EXTERNAL_URL.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.NODE_ENV !== "production") return;
  const { startKeepAlive } = await import("./lib/keepAlive");
  startKeepAlive();
}

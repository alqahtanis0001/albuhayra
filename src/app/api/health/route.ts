import { NextResponse } from "next/server";

import { getKeepAliveStatus } from "@/lib/keepAlive";

// The only unauthenticated route. Render hits it as the health check. It also
// shows the in-process keep-alive's last tick (a time and HTTP status codes —
// never a secret) so the scheduler can be checked from a browser.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { ok: true, keepAlive: getKeepAliveStatus() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

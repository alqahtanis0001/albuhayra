import { NextResponse } from "next/server";

// The only unauthenticated route. Render hits it as the health check.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

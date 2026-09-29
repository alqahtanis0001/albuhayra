import { NextResponse, type NextRequest } from "next/server";

/**
 * Phase 0 (lead): per-request nonce-based Content-Security-Policy.
 *
 * Next.js App Router ships two inline <script> tags carrying the hydration
 * payload, so a flat `script-src 'self'` breaks every page. The nonce is placed
 * on the *request* header, which is where Next.js looks for it before stamping
 * its own inline scripts — see the Decision logged in PROGRESS.md.
 *
 * Phase 1 (`backend`): add the session/role routing described in
 * docs/BACKEND.md ("Auth" → middleware) around the response below. Keep the
 * CSP block intact. The real authorisation checks stay in requireX().
 */

/** Paths that must stay reachable without a session. */
export const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/pending",
  "/api/health",
  "/manifest.json",
  "/sw.js",
] as const;

function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  // Dev needs eval for the Turbopack HMR runtime; production must not have it.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function proxy(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip static assets and the build output: they need no nonce, and hashing a
  // CSP for every chunk would only slow the response down.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|icons|favicon.ico|.*\\.png$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

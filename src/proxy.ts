import { getIronSession, nextProxyCookies } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";

import { homePathFor, type Role } from "@/lib/permissions";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/sessionConfig";

/**
 * Two jobs, in this order:
 *
 * 1. Phase 0 (lead): a per-request nonce-based Content-Security-Policy.
 *    Next.js App Router ships two inline <script> tags carrying the hydration
 *    payload, so a flat `script-src 'self'` breaks every page. The nonce is
 *    placed on the *request* header, which is where Next.js looks for it before
 *    stamping its own inline scripts — see the Decision logged in PROGRESS.md.
 *
 * 2. Phase 1 (`backend`): session/role routing (docs/BACKEND.md → Auth). This is
 *    a convenience only — it keeps signed-out visitors off the app shell and
 *    sends people to their own area. Every real authorisation check lives in the
 *    requireX() helpers, which re-read role and status from the database.
 */

/**
 * Reachable without a session, and pointless once you have one. v1.1e adds
 * `/forgot` and `/reset`: a signed-in user changes their password in settings.
 */
export const SIGNED_OUT_PATHS = ["/login", "/signup", "/forgot", "/reset"] as const;

/**
 * Reachable with or without a session, and never redirected either way.
 * `/pending` belongs here rather than above because requireUser() sends PENDING
 * users to it. `/_next`, `/icons` and `/favicon.ico` are listed for the sake of
 * docs/BACKEND.md even though `config.matcher` already keeps most of them out.
 */
export const OPEN_PATHS = [
  "/pending",
  // v1.1e: the code screen is reached with no session by design, and must not
  // bounce a still-signed-in visitor either — it only reads the flow cookie.
  "/verify",
  "/api/health",
  // v1.2c (docs/V12C-DESIGN.md C3, C17): the in-process scheduler has no session; the
  // route's own CRON_SECRET check is its gate.
  "/api/reminders/run",
  "/manifest.json",
  "/sw.js",
  "/_next",
  "/icons",
  "/favicon.ico",
] as const;

/** Everything reachable without a session. */
export const PUBLIC_PATHS = [...SIGNED_OUT_PATHS, ...OPEN_PATHS] as const;

/**
 * requireUser() appends this when it turns a stale session away. The proxy can
 * only see the cookie, never `status`, so without the marker it would send that
 * request straight back to the area requireUser() just refused — a loop that
 * would trap every disabled user until their cookie expired.
 */
const SIGNED_OUT_PARAM = "signedOut";

/** Route prefixes each role owns. */
const ROLE_AREAS: ReadonlyArray<{ prefix: string; role: Role }> = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/owner", role: "OWNER" },
  { prefix: "/staff", role: "STAFF" },
];

function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  // Dev needs eval for the Turbopack HMR runtime; production must not have it.
  const scriptSrc = isDev
    ? `'self' 'nonce-${nonce}' 'unsafe-eval'`
    : `'self' 'nonce-${nonce}' 'strict-dynamic'`;

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Not redundant, and not safely removable. A worker resolves through
    // worker-src → child-src → script-src → default-src; with the first two
    // absent it lands on script-src, where production's 'strict-dynamic' makes
    // 'self' inert. /sw.js is fetched by URL rather than from a nonced tag, so
    // nothing would permit it and registration is refused — but only in
    // production, because the dev branch has no 'strict-dynamic' and 'self'
    // still applies. Silent absence on Render, working locally.
    "worker-src 'self'",
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

function matches(pathname: string, paths: readonly string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Everything a *read* needs. The cookie name and lifetime come from
 * sessionConfig.ts so they cannot drift from src/lib/session.ts, which the proxy
 * cannot import. The proxy never saves or destroys a session.
 */
function sessionReadOptions() {
  return {
    password: process.env.SESSION_SECRET ?? "",
    cookieName: SESSION_COOKIE,
    ttl: SESSION_TTL_SECONDS,
  };
}

/** The signed-in role, or null for anyone the cookie cannot vouch for. */
async function sessionRole(
  request: NextRequest,
  response: NextResponse,
): Promise<Role | null> {
  try {
    const session = await getIronSession<{ userId?: string; role?: Role }>(
      nextProxyCookies(request, response),
      sessionReadOptions(),
    );
    return session.userId && session.role ? session.role : null;
  } catch {
    // Missing secret, expired seal, tampered cookie: all simply "no session".
    return null;
  }
}

/** The path to send this request to, or null to let it through. */
async function destinationFor(
  request: NextRequest,
  response: NextResponse,
): Promise<string | null> {
  const { pathname } = request.nextUrl;
  if (matches(pathname, OPEN_PATHS)) return null;

  const role = await sessionRole(request, response);
  if (!role) return matches(pathname, SIGNED_OUT_PATHS) ? null : "/login";

  if (matches(pathname, SIGNED_OUT_PATHS)) {
    // Signed in already, so the login and sign-up forms are of no use — unless
    // requireUser() is the reason they are here.
    return request.nextUrl.searchParams.has(SIGNED_OUT_PARAM)
      ? null
      : homePathFor(role);
  }

  // Wrong area for this role: send them to their own instead of a bare refusal.
  const area = ROLE_AREAS.find((a) => matches(pathname, [a.prefix]));
  if (area && area.role !== role) return homePathFor(role);
  return null;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV !== "production");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const destination = await destinationFor(request, response);
  if (destination && destination !== request.nextUrl.pathname) {
    const redirect = NextResponse.redirect(new URL(destination, request.url));
    redirect.headers.set("Content-Security-Policy", csp);
    return redirect;
  }
  return response;
}

export const config = {
  // Skip static assets and the build output: they need no nonce, and hashing a
  // CSP for every chunk would only slow the response down. `.svg` joined `.png`
  // in v1.3: the page backgrounds are CSS images, and a signed-out visitor on
  // /login must get the file, not a redirect to /login.
  matcher: [
    {
      source: "/((?!_next/static|_next/image|icons|favicon.ico|.*\\.png$|.*\\.svg$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};

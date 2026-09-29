/**
 * The two session facts both the proxy and `session.ts` need.
 *
 * They live apart from `session.ts` because that module is `server-only` and
 * reads `cookies()` from `next/headers`, neither of which exists in the proxy
 * runtime — so importing it there fails. This file imports nothing, so both can
 * use it and the cookie name and lifetime are stated once.
 */

export const SESSION_COOKIE = "ledger_session";

export const SESSION_TTL_SECONDS = 12 * 60 * 60;

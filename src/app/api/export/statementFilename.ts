import { t } from "@/i18n/ar";

/**
 * The statement download's names (docs/V12C-DESIGN.md E11). Kept out of
 * `statement/route.ts`: a route module may export only its handlers.
 */

/** E11: an ASCII-only fallback name, from the database id and the date. */
export function asciiFilename(partyId: string, date: string): string {
  return `statement_${partyId.replace(/[^A-Za-z0-9_-]/g, "_")}_${date}.xlsx`;
}

/**
 * E11: the UTF-8 name (RFC 5987): control characters, quotes and path
 * characters become `_`, then percent-encoding — including `'()*`, which
 * `encodeURIComponent` leaves alone and RFC 5987 does not allow.
 */
export function utf8Filename(partyName: string, date: string): string {
  const safe = `${t.statementExport.sheetName} ${partyName}`
    .replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029"\\/:*?<>|]+/g, "_")
    .trim()
    .replace(/\s+/g, "_");
  return encodeURIComponent(`${safe}_${date}.xlsx`).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * v1.2c (docs/V12C-DESIGN.md C7, E7): owner-entered text — party names, plan
 * titles, the establishment name — may appear in the digest and client
 * reminder emails. The HTML part escapes it with `escapeHtml`; the subject and
 * the plain-text part carry it raw through `plainLine`. Pure, no imports.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** For text and attribute values in the HTML part only. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c]);
}

/**
 * For the subject and the plain-text part: no escaping (it would show as
 * `&amp;`), but no CR/LF or other control character either, so a name can
 * never start a new header or fake a line of the message.
 */
export function plainLine(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]+/g, " ").trim();
}

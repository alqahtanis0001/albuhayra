/**
 * Text normalisation shared by the name, email and join-code rules (docs/BACKEND.md A11).
 * Pure and client-safe.
 *
 * Why each step exists (measured in Node 24, see progress/reviewer.md → v1.1e S11):
 * - NFKC folds presentation forms and full-width letters into ordinary ones.
 * - Tatweel (U+0640) is a *letter* to Unicode, so a name stretched with it would otherwise
 *   trip the repeated-character rule; it carries no meaning, so it goes.
 * - Bidi and zero-width marks (RLM/LRM/ALM, ZWSP, isolates, BOM) are neither
 *   `\s` nor removed by `trim()`, so they would survive as invisible characters.
 */

const INVISIBLES = /[\u0640\u061C\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

export function stripInvisibles(value: string): string {
  return value.replace(INVISIBLES, "");
}

/** NFKC, invisibles removed, every run of whitespace one space, trimmed. */
export function normalizeText(value: string): string {
  return stripInvisibles(value.normalize("NFKC")).replace(/\s+/gu, " ").trim();
}

/** Arabic-Indic (U+0660–0669) and Eastern Arabic-Indic (U+06F0–06F9) digits → ASCII. */
export function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) =>
    String((d.charCodeAt(0) & 0xf) % 10),
  );
}

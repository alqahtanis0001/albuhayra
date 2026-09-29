/**
 * Money is always an integer number of halalas (1 SAR = 100 halalas).
 * Display uses Western digits with en-US grouping — never ar-SA, which would
 * render Arabic-Indic digits.
 */

export const HALALAS_PER_SAR = 100;

/**
 * 20,000,000 SAR — the validation ceiling, kept here so callers agree on it.
 * Every money column is a Postgres int4 (max 2,147,483,647 halalas ≈ 21.47M SAR);
 * the old 100M SAR ceiling let a valid-looking amount fail at the database
 * with a 500 (v1.2a review S1).
 */
export const MAX_AMOUNT_HALALAS = 2_000_000_000;

const SAR = "ر.س";

/** `123450` → `"1,234.50 ر.س"`. A `direction` adds the sign. */
export function formatSAR(halalas: number, direction?: "IN" | "OUT"): string {
  const abs = Math.abs(Math.trunc(halalas));
  const body = `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs / HALALAS_PER_SAR)} ${SAR}`;

  if (direction === "IN") return `+${body}`;
  if (direction === "OUT") return `−${body}`;
  return halalas < 0 ? `−${body}` : body;
}

/** Same as formatSAR but without the currency word — for table columns. */
export function formatAmount(halalas: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.trunc(halalas) / HALALAS_PER_SAR);
}

/**
 * `"1,234.50"` → `123450`. Accepts thousands separators, Arabic-Indic digits and
 * an Arabic decimal separator. Returns null for anything invalid: empty, NaN,
 * negative, zero, more than 2 decimals, or above MAX_AMOUNT_HALALAS.
 */
export function parseSAR(input: string): number | null {
  if (typeof input !== "string") return null;

  const normalized = toWesternDigits(input)
    .replace(/[\s ‏‎]/g, "")
    .replace(/,/g, "")
    .replace(/٫/g, ".");

  if (normalized === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const halalas =
    Number(whole) * HALALAS_PER_SAR + Number(fraction.padEnd(2, "0"));

  if (!Number.isSafeInteger(halalas)) return null;
  if (halalas <= 0) return null;
  if (halalas > MAX_AMOUNT_HALALAS) return null;

  return halalas;
}

/** Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits → 0-9. */
export function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });
}

/** Signed total in halalas: IN adds, OUT subtracts. */
export function net(inHalalas: number, outHalalas: number): number {
  return inHalalas - outHalalas;
}

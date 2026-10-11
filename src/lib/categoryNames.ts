/**
 * v1.4 part 3 (D29 R7, D33): the one source of the seeded IN category name a
 * customer's payment carries. `DEFAULT_CATEGORIES` seeds the current name; the
 * agreement forms' category prefill looks for it first and falls back to the
 * pre-part-3 name for establishments that renamed it by hand before the data
 * migration. Pure; no imports.
 */
export const CUSTOMER_PAYMENT_CATEGORY = "سداد من عميل";
export const LEGACY_CUSTOMER_PAYMENT_CATEGORY = "دفعة من عميل";

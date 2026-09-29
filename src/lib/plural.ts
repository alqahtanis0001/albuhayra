/**
 * Arabic plural forms (v1.2a review S9). A string that embeds a count is a
 * record of forms keyed by `Intl.PluralRules("ar")` category, because Arabic
 * agreement differs for 1, 2, 3–10 and 11–99: «بعد يومين», «بعد 3 أيام»,
 * «بعد 11 يوماً». Pure and client-safe; digits stay Western.
 */

export type PluralForms = {
  one: string;
  two: string;
  few: string;
  many: string;
  other: string;
};

const rules = new Intl.PluralRules("ar");

/** Picks the form for `n` and replaces `{n}` with the Western-digit count. */
export function plural(forms: PluralForms, n: number): string {
  const category = rules.select(n);
  // "zero" (n = 0) reads correctly with the "other" form in every string here.
  const form = category in forms ? forms[category as keyof PluralForms] : forms.other;
  return form.replace("{n}", String(n));
}

/**
 * The client-side half of entry validation: the same zod schema the action runs,
 * plus the one case the schema cannot phrase well on its own.
 *
 * Returns an error result, or null when the form is good — the caller then hands
 * the untouched FormData to the action, which validates again server-side.
 */
import { TransactionInputSchema, invalid, type ActionResult } from "@/lib/validation";

export function validateEntry(formData: FormData): ActionResult<null> | null {
  const raw = Object.fromEntries(formData);

  // An untouched amount submits "" for the hidden field, and Number("") is 0,
  // which the schema answers with err.amountPositive — "must be greater than
  // zero" for a field nobody has typed in. The visible field is in the form data
  // too, so the two cases can be told apart: empty means required,
  // non-empty-but-unparseable means invalid.
  if (String(raw.amountHalalas ?? "") === "") {
    const typed = String(raw.amountInput ?? "").trim();
    return {
      ok: false,
      error: "err.invalidInput",
      fieldErrors: {
        amountHalalas: typed === "" ? "err.required" : "err.amountInvalid",
      },
    };
  }

  const parsed = TransactionInputSchema.safeParse({
    ...raw,
    // FormData is all strings; the action coerces the same way.
    amountHalalas: Number(raw.amountHalalas),
  });
  return parsed.success ? null : invalid(parsed.error);
}

/**
 * v1.4 part 3 (D29 R4, D31b): `?saved=1` is the only transport for the
 * «تم حفظ الحركة» toast. The form appends it to its `doneHref`; the landing
 * page renders `SavedNotice`, which drops it again. Pure, so both halves are
 * testable without a DOM and the parameter never collides with a page's own
 * query (the ledger filters, the plan's `?paid=`).
 */
export const SAVED_PARAM = "saved";

/** `href` with `saved=1` added once — `/a` → `/a?saved=1`, `/a?x=1` → `/a?x=1&saved=1`. */
export function withSaved(href: string): string {
  const [path, query = ""] = href.split("?", 2);
  const params = new URLSearchParams(query);
  params.set(SAVED_PARAM, "1");
  return `${path}?${params.toString()}`;
}

/** The query string (`location.search`) without `saved`, keeping everything else; "" when nothing is left. */
export function withoutSaved(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(SAVED_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}

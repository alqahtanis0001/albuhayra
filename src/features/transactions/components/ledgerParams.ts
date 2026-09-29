/**
 * The ledger's filters live in the URL, which makes them attacker-controlled.
 * They go through `TransactionFilterSchema` — the same schema the query uses —
 * and anything that fails falls back to the unfiltered default rather than
 * throwing: a hand-edited query string should show the ledger, not an error.
 */
import { TransactionFilterSchema, type TransactionFilter } from "@/lib/validation";

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Keeps only single-valued strings; `?q=a&q=b` is not a filter we accept. */
function singles(raw: RawSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string" && value !== "") out[key] = value;
  }
  return out;
}

export function parseLedgerFilters(raw: RawSearchParams): TransactionFilter {
  const parsed = TransactionFilterSchema.safeParse(singles(raw));
  return parsed.success ? parsed.data : TransactionFilterSchema.parse({});
}

/** The filters as a query string again, for pagination links. `page` is added there. */
export function filterParams(filters: TransactionFilter): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.from) out.from = filters.from;
  if (filters.to) out.to = filters.to;
  if (filters.direction) out.direction = filters.direction;
  if (filters.categoryId) out.categoryId = filters.categoryId;
  if (filters.paymentMethod) out.paymentMethod = filters.paymentMethod;
  // v1.2a: set only by links (an إضافة's chip); kept so paging keeps them.
  if (filters.partyId) out.partyId = filters.partyId;
  if (filters.projectId) out.projectId = filters.projectId;
  if (filters.q) out.q = filters.q;
  return out;
}

export function hasAnyFilter(filters: TransactionFilter): boolean {
  return Object.keys(filterParams(filters)).length > 0;
}

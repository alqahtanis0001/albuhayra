/**
 * One skeleton per screen, shaped like the page it stands in for, so the swap
 * to real content moves nothing. Each loading.tsx renders exactly one of these.
 */
import {
  Bone,
  SkeletonButtons,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonPage,
  SkeletonRows,
  SkeletonStatCards,
  SkeletonTabs,
} from "./Skeleton";

/** /owner: four stat cards, balance by method, the chart, top OUT, recent. */
export function OwnerDashboardSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonStatCards count={4} />
      <SkeletonCard title>
        <SkeletonRows count={3} />
      </SkeletonCard>
      <SkeletonCard title>
        <div className="p-4">
          <Bone className="h-48 w-full" />
        </div>
      </SkeletonCard>
      <SkeletonCard title>
        <SkeletonRows count={3} />
      </SkeletonCard>
      <SkeletonCard title>
        <SkeletonRows count={5} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /staff: two stat cards with the establishment-wide caption, then recent. */
export function StaffDashboardSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <div className="flex flex-col gap-1">
        <SkeletonStatCards count={2} />
        <Bone onBody className="h-3 w-56 max-w-full" />
      </div>
      <SkeletonCard title>
        <SkeletonRows count={5} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /owner/transactions and /staff/transactions: filters, totals, rows. */
export function LedgerSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonCard className="flex flex-col gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonField key={i} />
          ))}
        </div>
        <SkeletonButtons />
      </SkeletonCard>
      <SkeletonCard className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Bone className="h-3 w-16" />
            <Bone className="h-5 w-24 max-w-full" />
          </div>
        ))}
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonRows count={6} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/**
 * The add / edit form: direction toggle, amount, date, category, method,
 * counterparty, note, then حفظ (+ حفظ وإضافة أخرى on "new").
 */
export function EntryFormSkeleton({ mode }: { mode: "new" | "edit" }) {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-1">
        <Bone onBody className="mb-1 h-4 w-20" />
        <div className="grid min-h-11 grid-cols-2 rounded-lg border border-gray-300 bg-white" />
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <SkeletonField key={i} onBody />
      ))}
      <SkeletonField onBody tall />
      <SkeletonButtons onBody count={mode === "new" ? 2 : 1} />
    </SkeletonPage>
  );
}

/** /owner/reports: range picker, export + print, two category tables. */
export function ReportsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard className="grid gap-3 p-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SkeletonField />
          <SkeletonButtons />
        </div>
        <div className="flex flex-col gap-3">
          <Bone className="h-4 w-28" />
          <SkeletonField />
          <SkeletonField />
          <SkeletonButtons />
        </div>
      </SkeletonCard>
      <SkeletonButtons onBody count={2} />
      <SkeletonCard title>
        <SkeletonRows count={4} />
      </SkeletonCard>
      <SkeletonCard title>
        <SkeletonRows count={4} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /owner/settings: the five-tab strip over a list. */
export function SettingsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTabs count={5} />
      <SkeletonCard>
        <SkeletonRows count={5} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** حسابي (staff, admin): the change-password form, straight on the page. */
export function AccountSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex max-w-sm flex-col gap-4">
        <SkeletonField onBody />
        <SkeletonField onBody />
        <SkeletonField onBody />
        <SkeletonButtons onBody />
      </div>
    </SkeletonPage>
  );
}

/** /admin: pending owner requests, each with approve / reject. */
export function AdminRequestsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard>
        <ul>
          {Array.from({ length: 3 }, (_, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 border-b border-gray-200 p-3 last:border-b-0"
            >
              <Bone className="h-5 w-48 max-w-full" />
              <Bone className="h-4 w-40 max-w-full" />
              <Bone className="h-3 w-28" />
              <SkeletonButtons count={2} />
            </li>
          ))}
        </ul>
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /admin/establishments: search box, then the table. */
export function AdminEstablishmentsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1">
          <SkeletonField onBody />
        </div>
        <Bone onBody className="h-11 w-20" />
      </div>
      <SkeletonCard>
        <SkeletonRows count={6} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

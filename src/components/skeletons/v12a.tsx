/**
 * Skeletons for the v1.2a screens (الجهات, إضافة). Same rules as screens.tsx:
 * one per loading.tsx, shaped like the page, no data, no client code.
 */
import {
  Bone,
  SkeletonButtons,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonPage,
  SkeletonRows,
  SkeletonTabs,
} from "./Skeleton";

/** /owner/parties: heading + add, type tabs, rows. */
export function PartiesSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonTabs count={5} />
      <SkeletonCard>
        <SkeletonRows count={6} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** Add / edit a party or an إضافة: fields straight on the page, then حفظ. */
export function EntityFormSkeleton({ fields }: { fields: number }) {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex max-w-xl flex-col gap-4">
        {Array.from({ length: fields }, (_, i) => (
          <SkeletonField key={i} onBody />
        ))}
        <SkeletonButtons onBody />
      </div>
    </SkeletonPage>
  );
}

/** /owner/parties/[id]: heading, the contact card, the controls, the statement. */
export function PartyDetailSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard className="flex flex-col gap-3 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Bone className="h-4 w-20" />
            <Bone className="h-4 w-40 max-w-full" />
          </div>
        ))}
      </SkeletonCard>
      <SkeletonButtons onBody count={3} />
      <SkeletonCard title>
        <SkeletonRows count={4} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** One إضافة card: name and status, amounts, the budget bar. */
function ProjectCardBones() {
  return (
    <SkeletonCard className="flex flex-col gap-3 p-4">
      <div className="flex justify-between gap-2">
        <Bone className="h-5 w-40 max-w-full" />
        <Bone className="h-5 w-14" />
      </div>
      <Bone className="h-4 w-56 max-w-full" />
      <Bone className="h-2 w-full" />
    </SkeletonCard>
  );
}

/** /owner/projects: heading + add, status tabs, cards. */
export function ProjectsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonTabs count={4} />
      {Array.from({ length: 3 }, (_, i) => (
        <ProjectCardBones key={i} />
      ))}
    </SkeletonPage>
  );
}

/** /owner/projects/[id]: header, totals, by category, its entries. */
export function ProjectDetailSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonButtons onBody count={4} />
      <ProjectCardBones />
      <SkeletonCard title>
        <SkeletonRows count={3} />
      </SkeletonCard>
      <SkeletonCard title>
        <SkeletonRows count={5} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /owner/plans: heading + add, the filter card, agreement cards. */
export function PlansSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonCard className="grid gap-3 p-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <SkeletonField key={i} />
        ))}
      </SkeletonCard>
      {Array.from({ length: 3 }, (_, i) => (
        <ProjectCardBones key={i} />
      ))}
    </SkeletonPage>
  );
}

/** /owner/plans/new and edit: the fields, then the schedule card. */
export function PlanFormSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 7 }, (_, i) => (
          <SkeletonField key={i} onBody />
        ))}
        <SkeletonCard className="p-4">
          <SkeletonRows count={3} />
        </SkeletonCard>
        <SkeletonButtons onBody />
      </div>
    </SkeletonPage>
  );
}

/** /owner/plans/[id]: heading, the facts card, controls, instalments. */
export function PlanDetailSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard className="flex flex-col gap-3 p-4">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Bone className="h-4 w-20" />
            <Bone className="h-4 w-40 max-w-full" />
          </div>
        ))}
      </SkeletonCard>
      <SkeletonButtons onBody count={3} />
      <SkeletonCard title>
        <SkeletonRows count={4} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /owner/dues: the red overdue section, then this week's. */
export function DuesSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard title>
        <SkeletonRows count={3} />
      </SkeletonCard>
      <SkeletonCard title>
        <SkeletonRows count={4} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

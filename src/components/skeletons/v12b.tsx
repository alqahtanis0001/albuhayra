/**
 * Skeletons for the v1.2b screens (الموظفون, قسيمة الراتب). Same rules as
 * screens.tsx: one per loading.tsx, shaped like the page, no data, no client code.
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

/** A card of label/value lines, like a `<dl>` facts card. */
function FactBones({ count }: { count: number }) {
  return (
    <SkeletonCard className="flex flex-col gap-3 p-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex gap-4">
          <Bone className="h-4 w-24" />
          <Bone className="h-4 w-40 max-w-full" />
        </div>
      ))}
    </SkeletonCard>
  );
}

/** /owner/staff: heading + add, نشطون/سابقون tabs, rows. */
export function EmployeesSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader action />
      <SkeletonTabs count={2} />
      <SkeletonCard>
        <SkeletonRows count={5} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** Add / edit an employee: four section cards, then حفظ. */
export function EmployeeFormSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <div className="flex max-w-2xl flex-col gap-4">
        {[5, 3, 3, 1].map((fields, i) => (
          <SkeletonCard key={i} title>
            <div className="flex flex-col gap-4 p-4">
              {Array.from({ length: fields }, (_, j) => (
                <SkeletonField key={j} />
              ))}
            </div>
          </SkeletonCard>
        ))}
        <SkeletonButtons onBody />
      </div>
    </SkeletonPage>
  );
}

/** /owner/staff/[id]: heading, the controls, the profile card, this month's salary. */
export function EmployeeDetailSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonButtons onBody count={3} />
      <FactBones count={5} />
      <FactBones count={4} />
    </SkeletonPage>
  );
}

/** The payslip: heading, the employee card, the amounts table, payments. */
export function PayslipSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <FactBones count={3} />
      <SkeletonCard title>
        <SkeletonRows count={5} />
      </SkeletonCard>
      <SkeletonCard title>
        <SkeletonRows count={1} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /owner/staff/attendance: heading, يومي/شهري tabs, the picker, one card per employee. */
export function AttendanceSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonTabs count={2} />
      <div className="flex max-w-xs items-end gap-3">
        <SkeletonField onBody />
        <Bone onBody className="h-11 w-20 shrink-0" />
      </div>
      <SkeletonCard>
        <SkeletonRows count={4} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** /owner/staff/[id]/month/[ym] and «حضوري» months: heading, month links, totals, salary, days. */
export function EmployeeMonthSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonButtons onBody count={2} />
      <FactBones count={4} />
      <FactBones count={5} />
      <SkeletonCard>
        <SkeletonRows count={7} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

/** «حضوري» lists (payslips, salary months): heading and rows. */
export function ListSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard>
        <SkeletonRows count={4} />
      </SkeletonCard>
    </SkeletonPage>
  );
}

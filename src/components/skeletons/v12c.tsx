/**
 * Skeletons for the v1.2c screens (التذكيرات, التقارير). Same rules as
 * screens.tsx: one per loading.tsx, shaped like the page, no data, no client code.
 */
import {
  Bone,
  SkeletonButtons,
  SkeletonCard,
  SkeletonField,
  SkeletonHeader,
  SkeletonPage,
} from "./Skeleton";

/** /owner/settings/reminders: one titled card — help, recipient, switch, hour, save. */
export function ReminderSettingsSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonHeader />
      <SkeletonCard title>
        <div className="flex flex-col gap-4 p-4">
          <Bone className="h-4 w-full max-w-md" />
          <Bone className="h-4 w-56 max-w-full" />
          <div className="flex max-w-sm flex-col gap-4">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <Bone className="h-4 w-32" />
              <Bone className="h-6 w-11" />
            </div>
            <SkeletonField />
            <SkeletonButtons />
          </div>
        </div>
      </SkeletonCard>
    </SkeletonPage>
  );
}

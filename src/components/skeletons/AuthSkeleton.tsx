/**
 * The auth screens' skeleton, shaped like AuthCard: the wordmark above a card
 * with the green top rule, its title, then the variant's body.
 */
import { Bone, SkeletonField, SkeletonPage } from "./Skeleton";

type Variant = "login" | "signup" | "pending" | "verify" | "forgot" | "reset";

export function AuthSkeleton({ variant }: { variant: Variant }) {
  return (
    <SkeletonPage>
      <div className="mb-2 flex justify-center">
        <Bone onBody className="h-16 w-64 max-w-full" />
      </div>

      <div className="rounded-lg border border-t-4 border-gray-300 border-t-accent bg-white p-5">
        <div className="border-b border-gray-200 pb-3">
          <Bone className="h-6 w-40" />
        </div>
        <div className="mt-4 flex flex-col gap-4">
          {variant === "login" ? (
            <>
              <SkeletonField />
              <SkeletonField />
              <Bone className="h-11 w-full" />
            </>
          ) : null}

          {/* The two choice cards (صاحب منشأة / موظف) that /signup opens on. */}
          {variant === "signup" ? (
            <div className="flex flex-col gap-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-300 p-4"
                >
                  <Bone className="size-6 shrink-0" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Bone className="h-5 w-28" />
                    <Bone className="h-4 w-44 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Where the code went, the wide code field, تأكيد, the resend line. */}
          {variant === "verify" ? (
            <>
              <Bone className="h-4 w-3/4" />
              <SkeletonField />
              <Bone className="h-11 w-full" />
              <Bone className="mx-auto h-11 w-48" />
            </>
          ) : null}

          {variant === "forgot" ? (
            <>
              <Bone className="h-4 w-full" />
              <SkeletonField />
              <Bone className="h-11 w-full" />
            </>
          ) : null}

          {/* Code, new password with its meter, confirmation. */}
          {variant === "reset" ? (
            <>
              <SkeletonField />
              <SkeletonField />
              <Bone className="h-1.5 w-full" />
              <SkeletonField />
              <Bone className="h-11 w-full" />
            </>
          ) : null}

          {variant === "pending" ? (
            <>
              <Bone className="h-4 w-full" />
              <Bone className="h-4 w-3/4" />
              <Bone className="h-11 w-full" />
            </>
          ) : null}
        </div>
      </div>
    </SkeletonPage>
  );
}

export default AuthSkeleton;

import type { Metadata } from "next";

import { RoleChoice } from "@/features/auth/components/RoleChoice";
import { SignupForm } from "@/features/auth/components/SignupForm";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t.auth.signupTitle };

/** `?as=owner` / `?as=staff` pick the form; without it, the two choice cards. */
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as } = await searchParams;

  if (as === "owner" || as === "staff") return <SignupForm role={as} />;
  return <RoleChoice />;
}

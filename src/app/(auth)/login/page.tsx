import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t.auth.loginTitle };

/** `?reset=1` is where a successful /reset lands (docs/BACKEND.md, A8). */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;
  return <LoginForm passwordReset={reset === "1"} />;
}

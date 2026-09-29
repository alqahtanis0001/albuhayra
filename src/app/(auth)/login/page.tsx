import type { Metadata } from "next";

import { LoginForm } from "@/features/auth/components/LoginForm";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t.auth.loginTitle };

export default function LoginPage() {
  return <LoginForm />;
}

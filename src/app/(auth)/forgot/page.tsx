import type { Metadata } from "next";

import { ForgotForm } from "@/features/auth/components/ForgotForm";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t.forgot.title };

export default function ForgotPage() {
  return <ForgotForm />;
}

import type { Metadata } from "next";

import { ResetForm } from "@/features/auth/components/ResetForm";
import { t } from "@/i18n/ar";

export const metadata: Metadata = { title: t.reset.title };

export default function ResetPage() {
  return <ResetForm />;
}

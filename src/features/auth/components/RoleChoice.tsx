import Link from "next/link";

import { BuildingIcon, UsersIcon } from "@/components/icons";
import { t } from "@/i18n/ar";

import { AuthCard } from "./AuthCard";

/** Step one of sign-up: صاحب منشأة or موظف. */
export function RoleChoice() {
  return (
    <AuthCard
      title={t.auth.signupChooseTitle}
      subtitle={t.auth.chooseRole}
      footer={
        <Link href="/login" className="font-medium text-accent-dark underline">
          {t.auth.loginLink}
        </Link>
      }
    >
      <div className="flex flex-col gap-3">
        <Choice
          href="/signup?as=owner"
          title={t.auth.asOwner}
          hint={t.auth.asOwnerHint}
          icon={<BuildingIcon size={28} />}
        />
        <Choice
          href="/signup?as=staff"
          title={t.auth.asStaff}
          hint={t.auth.asStaffHint}
          icon={<UsersIcon size={28} />}
        />
      </div>
    </AuthCard>
  );
}

function Choice({
  href,
  title,
  hint,
  icon,
}: {
  href: string;
  title: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center gap-3 rounded-xl border border-gray-300 bg-white p-4 text-start hover:border-accent hover:bg-accent-soft"
    >
      <span className="text-accent-dark">{icon}</span>
      <span className="flex-1">
        <span className="block text-base font-semibold text-gray-900">{title}</span>
        <span className="block text-sm text-gray-600">{hint}</span>
      </span>
    </Link>
  );
}

export default RoleChoice;

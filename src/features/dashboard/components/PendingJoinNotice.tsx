import Link from "next/link";

import { t } from "@/i18n/ar";

/**
 * v1.4 part 3 (D29 R9, D32 S5): the owner home's notice of pending join
 * requests — one line per name, newest first, in a card that links to
 * /owner/staff/logins. `role="status"` sits on the wrapper, never on the link.
 * Nothing for an empty list. Server component; `no-print`.
 */
export function PendingJoinNotice({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <div
      role="status"
      className="no-print flex flex-col gap-2 rounded-xl border border-accent-line bg-accent-soft p-3 text-sm text-gray-900"
    >
      <ul className="flex flex-col gap-1">
        {names.map((name, i) => (
          <li key={`${i}-${name}`} className="font-medium">
            {t.pendingJoin.one.replace("{name}", name)}
          </li>
        ))}
      </ul>
      <Link
        href="/owner/staff/logins"
        className="inline-flex min-h-11 items-center self-start font-medium text-accent-dark underline underline-offset-2"
      >
        {t.pendingJoin.open}
      </Link>
    </div>
  );
}

export default PendingJoinNotice;

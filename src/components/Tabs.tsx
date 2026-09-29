/**
 * Link tabs (owner settings). Links, not buttons: each tab is a URL, so it
 * survives a reload and keeps every page a server component.
 */
import Link from "next/link";

export type TabItem = { key: string; label: string; href: string };

export function Tabs({
  tabs,
  active,
  label,
}: {
  tabs: TabItem[];
  active: string;
  /** Accessible name for the tab strip. */
  label: string;
}) {
  return (
    <nav aria-label={label} className="no-print -mx-4 overflow-x-auto px-4">
      <ul className="flex min-w-max gap-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          return (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "flex min-h-11 items-center rounded-t-lg border-b-2 px-3 text-sm font-medium",
                  isActive
                    ? "border-accent text-accent-dark"
                    : "border-transparent text-gray-600 hover:text-gray-900",
                ].join(" ")}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default Tabs;

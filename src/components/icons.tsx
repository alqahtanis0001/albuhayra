/**
 * Inline SVG icons. There is no icon package in the stack (see CLAUDE.md), so
 * every icon lives here: 24x24, stroked with currentColor, decorative by
 * default. Directional icons are flipped for RTL with `rtl:-scale-x-100`.
 */
import type { ReactNode, SVGProps } from "react";

export type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  size?: number;
};

export function Svg({ size = 20, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V21h13V9.5" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <path d="M4 6h.01M4 12h.01M4 18h.01" />
  </Svg>
);

export const ChartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <path d="M7 21V12M12 21V4M17 21v-6" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M4 17h16" />
    <circle cx="9" cy="7" r="2.25" />
    <circle cx="15" cy="17" r="2.25" />
  </Svg>
);

export const InboxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 13h5l1.5 2.5h5L16 13h5" />
    <path d="M3 13 5.5 4.5h13L21 13v6.5H3V13Z" />
  </Svg>
);

export const BuildingIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 21V5.5L13 3v18" />
    <path d="M13 9h7v12" />
    <path d="M7.5 8h2M7.5 12h2M7.5 16h2M16 13h1.5M16 17h1.5" />
  </Svg>
);

export const UserIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </Svg>
);

export const UsersIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.25" />
    <path d="M3 20c0-3.1 2.7-5 6-5s6 1.9 6 5" />
    <path d="M16 5.5a3.25 3.25 0 0 1 0 6.5M18 20c0-2.2-.6-3.7-1.8-4.6" />
  </Svg>
);

export const LogoutIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M14 4H6v16h8" />
    <path d="M18 12H10" />
    <path d="m15 9 3 3-3 3" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

/** Points toward the start of the line (right in RTL). */
export const ChevronStartIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14 6-6 6 6 6" className="rtl:hidden" />
    <path d="m10 6 6 6-6 6" className="hidden rtl:block" />
  </Svg>
);

/** Points toward the end of the line (left in RTL). */
export const ChevronEndIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m10 6 6 6-6 6" className="rtl:hidden" />
    <path d="m14 6-6 6 6 6" className="hidden rtl:block" />
  </Svg>
);

/**
 * Up and down are **not** direction-flipping: a vertical list's order has nothing
 * to do with text direction, so these carry no `rtl:` variant — unlike the
 * horizontal chevrons above. Rotating one of those would work in RTL and point
 * the wrong way in LTR.
 */
export const ChevronUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 14 6-6 6 6" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 10 6 6 6-6" />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M15 6V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5h6v2M6.5 7l.8 13h9.4l.8-13" />
    <path d="M10.5 11v5M13.5 11v5" />
  </Svg>
);

export const PencilIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
    <path d="m14.5 5.5 4 4" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

/** A three-quarter ring; the caller spins it (`motion-safe:animate-spin`). */
export const SpinnerIcon = (p: IconProps) => (
  <Svg strokeWidth={2.5} {...p}>
    <path d="M12 3a9 9 0 1 1-9 9" />
  </Svg>
);

/**
 * Navigation icons (v1.2a) and the NAV_ICONS map. Split from icons.tsx to keep
 * both files short; same rules: 24x24, currentColor, decorative, and none of
 * these is directional, so none carries an `rtl:` variant.
 */
import {
  BuildingIcon,
  ChartIcon,
  HomeIcon,
  InboxIcon,
  ListIcon,
  LockIcon,
  PlusIcon,
  SettingsIcon,
  Svg,
  UserIcon,
  UsersIcon,
  type IconProps,
} from "./icons";

export const FolderIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.5V19h18V8.5h-9L10 5.5H3v1Z" />
  </Svg>
);

export const FolderPlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6.5V19h18V8.5h-9L10 5.5H3v1Z" />
    <path d="M12 11v5M9.5 13.5h5" />
  </Svg>
);

/** A contact card: الجهات. */
export const ContactsIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <circle cx="10" cy="10.5" r="2.25" />
    <path d="M6.5 16.5c.5-1.7 1.8-2.6 3.5-2.6s3 .9 3.5 2.6M15.5 9.5h2.5M15.5 13h2.5" />
  </Svg>
);

/** A document with lines: الاتفاقيات. */
export const FileTextIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3h8.5L19 7.5V21H6V3Z" />
    <path d="M14 3v5h5M9 12h7M9 16h7" />
  </Svg>
);

export const CalendarIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const KeyIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2" />
  </Svg>
);

export const TagIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 3.5h8l9 9-8 8-9-9v-8Z" />
    <path d="M8 8h.01" />
  </Svg>
);

export const HashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 9h15M4 15h15M10 4 8 20M16 4l-2 16" />
  </Svg>
);

/** Nine squares: المزيد. */
export const GridIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
  </Svg>
);

/** Nav items cross the server/client boundary, so they name their icon. */
export const NAV_ICONS = {
  home: HomeIcon,
  add: PlusIcon,
  ledger: ListIcon,
  reports: ChartIcon,
  settings: SettingsIcon,
  requests: InboxIcon,
  establishments: BuildingIcon,
  account: UserIcon,
  staff: UsersIcon,
  projects: FolderIcon,
  projectNew: FolderPlusIcon,
  parties: ContactsIcon,
  plans: FileTextIcon,
  dues: CalendarIcon,
  attendance: ClockIcon,
  logins: KeyIcon,
  categories: TagIcon,
  joinCode: HashIcon,
  locks: LockIcon,
  more: GridIcon,
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

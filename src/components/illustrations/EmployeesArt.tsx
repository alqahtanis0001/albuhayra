import { Frame, GOLD } from "./Frame";

/** A staff card with a portrait and lines, hung from a gold clip (الموظفون). */
export function EmployeesArt() {
  return (
    <Frame>
      <rect x="26" y="24" width="68" height="58" rx="4" />
      <path d="M52 14h16v14H52z" stroke={GOLD} />
      <circle cx="46" cy="48" r="8" />
      <path d="M34 72c0-8 5-12 12-12s12 4 12 12" />
      <path d="M66 46h18M66 56h18M66 66h12" />
    </Frame>
  );
}

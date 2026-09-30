import { Frame, GOLD } from "./Frame";

/** A folder holding a page, with a gold tag (الإضافات). */
export function ProjectsArt() {
  return (
    <Frame>
      <path d="M16 30v46a4 4 0 0 0 4 4h80a4 4 0 0 0 4-4V38a4 4 0 0 0-4-4H58l-8-8H20a4 4 0 0 0-4 4z" />
      <path d="M34 34V20h40v14" />
      <path d="M42 26h24" />
      <path d="M78 52h16l6 7-6 7H78z" stroke={GOLD} />
      <circle cx="84" cy="59" r="1.5" stroke={GOLD} />
    </Frame>
  );
}

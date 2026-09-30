import { Frame, GOLD } from "./Frame";

/** Two people facing each other, joined by a gold link (الجهات). */
export function PartiesArt() {
  return (
    <Frame>
      <circle cx="36" cy="32" r="10" />
      <path d="M18 74c0-13 8-22 18-22s18 9 18 22" />
      <circle cx="84" cy="32" r="10" />
      <path d="M66 74c0-13 8-22 18-22s18 9 18 22" />
      <path d="M52 44h16" stroke={GOLD} />
      <circle cx="52" cy="44" r="3" stroke={GOLD} />
      <circle cx="68" cy="44" r="3" stroke={GOLD} />
      <path d="M12 80h96" />
    </Frame>
  );
}

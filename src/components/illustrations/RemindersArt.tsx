import { Frame, GOLD } from "./Frame";

/** A bell over a dated page, its clapper in gold (الاتفاقيات / التذكيرات). */
export function RemindersArt() {
  return (
    <Frame>
      <path d="M60 14v6" />
      <path d="M40 62V44a20 20 0 0 1 40 0v18l6 8H34z" />
      <path d="M54 76a6 6 0 0 0 12 0" stroke={GOLD} />
      <path d="M22 30c-4 6-4 14 0 20M98 30c4 6 4 14 0 20" />
      <path d="M16 84h88" />
    </Frame>
  );
}

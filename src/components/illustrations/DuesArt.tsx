import { Frame, GOLD } from "./Frame";

/** A week calendar with one gold-ringed day (المستحقات). */
export function DuesArt() {
  return (
    <Frame>
      <rect x="22" y="18" width="76" height="64" rx="4" />
      <path d="M22 34h76M40 12v12M80 12v12" />
      <path d="M34 48h6M52 48h6M70 48h6M88 48h2M34 64h6M52 64h6M88 64h2" />
      <circle cx="73" cy="64" r="7" stroke={GOLD} />
    </Frame>
  );
}

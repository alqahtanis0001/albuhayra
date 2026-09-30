import { Frame, GOLD } from "./Frame";

/** An open ledger with ruled lines and a gold coin (السجل). */
export function LedgerArt() {
  return (
    <Frame>
      <path d="M60 24c-10-6-26-7-40-4v56c14-3 30-2 40 4 10-6 26-7 40-4V20c-14-3-30-2-40 4z" />
      <path d="M60 24v56" />
      <path d="M28 34h22M28 44h22M28 54h16M70 34h22M70 44h22M70 54h14" />
      <circle cx="94" cy="70" r="11" stroke={GOLD} fill="#fff" />
      <path d="M94 64v12M90.5 67h7" stroke={GOLD} />
    </Frame>
  );
}

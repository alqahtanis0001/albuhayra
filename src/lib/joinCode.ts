import { randomInt } from "node:crypto";

import { JOIN_CODE_LENGTH } from "./validation";

/**
 * No 0/O/1/I/L — an owner reads this code out loud to a new employee.
 * Validation still accepts any 8 uppercase alphanumerics so older codes keep working.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateJoinCode(): string {
  let out = "";
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

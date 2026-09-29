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

/**
 * A join code no establishment holds yet. Codes are 31^8 wide, so a collision is
 * already unlikely; a handful of tries makes it not worth thinking about. Pass a
 * transaction client when allocating inside one.
 */
export async function allocateJoinCode(client: {
  establishment: {
    findUnique(args: {
      where: { joinCode: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
}): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const joinCode = generateJoinCode();
    const taken = await client.establishment.findUnique({
      where: { joinCode },
      select: { id: true },
    });
    if (!taken) return joinCode;
  }
  throw new Error("could not allocate a unique join code");
}

import { describe, expect, it } from "vitest";

import { generateJoinCode } from "./joinCode";
import { JOIN_CODE_LENGTH, joinCode } from "./validation";

describe("generateJoinCode", () => {
  it("produces 8 characters that the join-code schema accepts", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateJoinCode();
      expect(code).toHaveLength(JOIN_CODE_LENGTH);
      expect(joinCode.safeParse(code).success).toBe(true);
    }
  });

  it("never uses characters an owner could misread aloud", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateJoinCode()).not.toMatch(/[01OIL]/);
    }
  });

  it("does not repeat itself", () => {
    const codes = new Set(Array.from({ length: 200 }, generateJoinCode));
    expect(codes.size).toBeGreaterThan(190);
  });
});

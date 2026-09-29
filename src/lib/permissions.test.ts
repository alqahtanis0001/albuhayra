import { describe, expect, it } from "vitest";

import {
  canCreateTransactions,
  canDeleteTransactions,
  canEditTransactions,
  homePathFor,
  isActive,
  type PermissionSubject,
} from "./permissions";

function subject(over: Partial<PermissionSubject> = {}): PermissionSubject {
  return {
    role: "STAFF",
    status: "ACTIVE",
    canEdit: false,
    establishmentId: "est_1",
    ...over,
  };
}

describe("canEditTransactions", () => {
  it("allows an active owner", () => {
    expect(canEditTransactions(subject({ role: "OWNER" }))).toBe(true);
  });

  it("allows active staff only while canEdit is on", () => {
    expect(canEditTransactions(subject({ canEdit: true }))).toBe(true);
    expect(canEditTransactions(subject({ canEdit: false }))).toBe(false);
  });

  it("refuses anyone who is not ACTIVE, whatever their flags say", () => {
    expect(canEditTransactions(subject({ status: "PENDING", canEdit: true }))).toBe(false);
    expect(canEditTransactions(subject({ status: "DISABLED", canEdit: true }))).toBe(false);
    expect(
      canEditTransactions(subject({ role: "OWNER", status: "DISABLED" })),
    ).toBe(false);
  });

  it("never allows the platform admin to touch financial data", () => {
    expect(
      canEditTransactions(subject({ role: "ADMIN", canEdit: true, establishmentId: null })),
    ).toBe(false);
  });
});

describe("canDeleteTransactions", () => {
  it("is owner-only", () => {
    expect(canDeleteTransactions(subject({ role: "OWNER" }))).toBe(true);
    expect(canDeleteTransactions(subject({ canEdit: true }))).toBe(false);
    expect(canDeleteTransactions(subject({ role: "ADMIN", establishmentId: null }))).toBe(false);
    expect(canDeleteTransactions(subject({ role: "OWNER", status: "PENDING" }))).toBe(false);
  });
});

describe("canCreateTransactions", () => {
  it("allows any active member, with or without canEdit", () => {
    expect(canCreateTransactions(subject())).toBe(true);
    expect(canCreateTransactions(subject({ role: "OWNER" }))).toBe(true);
  });

  it("refuses a user with no establishment and refuses the admin", () => {
    expect(canCreateTransactions(subject({ establishmentId: null }))).toBe(false);
    expect(canCreateTransactions(subject({ role: "ADMIN", establishmentId: null }))).toBe(false);
  });

  it("refuses a pending member", () => {
    expect(canCreateTransactions(subject({ status: "PENDING" }))).toBe(false);
  });
});

describe("isActive", () => {
  it("is true only for ACTIVE", () => {
    expect(isActive({ status: "ACTIVE" })).toBe(true);
    expect(isActive({ status: "PENDING" })).toBe(false);
    expect(isActive({ status: "DISABLED" })).toBe(false);
  });
});

describe("homePathFor", () => {
  it("maps every role to its area", () => {
    expect(homePathFor("ADMIN")).toBe("/admin");
    expect(homePathFor("OWNER")).toBe("/owner");
    expect(homePathFor("STAFF")).toBe("/staff");
  });
});

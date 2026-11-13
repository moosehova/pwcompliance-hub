import { describe, it, expect } from "vitest";
import { hasPermission, getRolePermissions } from "@/lib/permissions";
import type { MemberRole } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function can(role: MemberRole, perm: string) {
  return hasPermission(role, perm as never);
}

// ─── COMPLIANCE_OFFICER ───────────────────────────────────────────────────────

describe("COMPLIANCE_OFFICER", () => {
  it("has tax:view", () => {
    expect(can("COMPLIANCE_OFFICER", "tax:view")).toBe(true);
  });

  it("does NOT have tax:prepare", () => {
    expect(can("COMPLIANCE_OFFICER", "tax:prepare")).toBe(false);
  });

  it("does NOT have tax:review", () => {
    expect(can("COMPLIANCE_OFFICER", "tax:review")).toBe(false);
  });

  it("does NOT have tax:approve", () => {
    expect(can("COMPLIANCE_OFFICER", "tax:approve")).toBe(false);
  });

  it("does NOT have tax:submit", () => {
    expect(can("COMPLIANCE_OFFICER", "tax:submit")).toBe(false);
  });
});

// ─── Separation of duties ─────────────────────────────────────────────────────

// OWNER and ADMINISTRATOR are super-admin roles with ALL permissions by design.
// All other roles must not combine tax:prepare with tax:approve (four-eyes principle).
describe("separation of duties — restricted roles cannot have both tax:prepare AND tax:approve", () => {
  const restrictedRoles: MemberRole[] = [
    "ACCOUNTANT", "TAX_PRACTITIONER", "REVIEWER", "HR", "COMPLIANCE_OFFICER", "VIEWER",
  ];

  for (const role of restrictedRoles) {
    it(`${role} does not hold both tax:prepare and tax:approve`, () => {
      const perms = getRolePermissions(role);
      const hasBoth = perms.includes("tax:prepare") && perms.includes("tax:approve");
      expect(hasBoth).toBe(false);
    });
  }
});

// ─── REVIEWER can review and approve, but cannot prepare ─────────────────────

describe("REVIEWER", () => {
  it("has tax:review", () => expect(can("REVIEWER", "tax:review")).toBe(true));
  it("has tax:approve", () => expect(can("REVIEWER", "tax:approve")).toBe(true));
  it("does NOT have tax:prepare", () => expect(can("REVIEWER", "tax:prepare")).toBe(false));
  it("does NOT have tax:submit", () => expect(can("REVIEWER", "tax:submit")).toBe(false));
});

// ─── TAX_PRACTITIONER can prepare and submit, but cannot approve ──────────────

describe("TAX_PRACTITIONER", () => {
  it("has tax:prepare", () => expect(can("TAX_PRACTITIONER", "tax:prepare")).toBe(true));
  it("has tax:submit", () => expect(can("TAX_PRACTITIONER", "tax:submit")).toBe(true));
  it("does NOT have tax:approve", () => expect(can("TAX_PRACTITIONER", "tax:approve")).toBe(false));
  it("does NOT have tax:review", () => expect(can("TAX_PRACTITIONER", "tax:review")).toBe(false));
});

// ─── VIEWER has read-only access ──────────────────────────────────────────────

describe("VIEWER", () => {
  it("has tax:view", () => expect(can("VIEWER", "tax:view")).toBe(true));
  it("does NOT have tax:prepare", () => expect(can("VIEWER", "tax:prepare")).toBe(false));
  it("does NOT have document:manage", () => expect(can("VIEWER", "document:manage")).toBe(false));
});

// ─── HR has no tax permissions ───────────────────────────────────────────────

describe("HR", () => {
  it("does NOT have tax:view", () => expect(can("HR", "tax:view")).toBe(false));
  it("does NOT have tax:prepare", () => expect(can("HR", "tax:prepare")).toBe(false));
});

// ─── OWNER has all permissions ────────────────────────────────────────────────

describe("OWNER", () => {
  const taxPerms: string[] = ["tax:view", "tax:prepare", "tax:review", "tax:approve", "tax:submit"];
  for (const perm of taxPerms) {
    it(`has ${perm}`, () => expect(can("OWNER", perm as never)).toBe(true));
  }
});

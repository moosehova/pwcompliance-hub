import type { MemberRole } from "@prisma/client";

export type Permission =
  | "business:view" | "business:manage"
  | "employee:view" | "employee:manage"
  | "compliance:view" | "compliance:manage"
  | "payment:view" | "payment:manage"
  | "document:view" | "document:manage"
  | "payroll:view" | "payroll:manage"
  | "tax:view" | "tax:prepare" | "tax:review" | "tax:approve" | "tax:submit"
  | "report:view" | "report:export"
  | "settings:view" | "settings:manage"
  | "audit:view"
  | "user:manage";

const ALL_PERMISSIONS: Permission[] = [
  "business:view", "business:manage",
  "employee:view", "employee:manage",
  "compliance:view", "compliance:manage",
  "payment:view", "payment:manage",
  "document:view", "document:manage",
  "payroll:view", "payroll:manage",
  "tax:view", "tax:prepare", "tax:review", "tax:approve", "tax:submit",
  "report:view", "report:export",
  "settings:view", "settings:manage",
  "audit:view",
  "user:manage",
];

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMINISTRATOR: ALL_PERMISSIONS,
  ACCOUNTANT: [
    "business:view",
    "employee:view",
    "compliance:view", "compliance:manage",
    "payment:view", "payment:manage",
    "document:view", "document:manage",
    "payroll:view", "payroll:manage",
    "tax:view", "tax:prepare",
    "report:view", "report:export",
    "settings:view",
    "audit:view",
  ],
  TAX_PRACTITIONER: [
    "business:view",
    "employee:view",
    "compliance:view",
    "payment:view",
    "document:view", "document:manage",
    "tax:view", "tax:prepare", "tax:submit",
    "report:view", "report:export",
    "audit:view",
  ],
  REVIEWER: [
    "business:view",
    "employee:view",
    "compliance:view",
    "payment:view",
    "document:view",
    "tax:view", "tax:review", "tax:approve",
    "report:view",
    "audit:view",
  ],
  HR: [
    "employee:view", "employee:manage",
    "payroll:view", "payroll:manage",
    "document:view",
  ],
  COMPLIANCE_OFFICER: [
    "business:view",
    "compliance:view", "compliance:manage",
    "payment:view", "payment:manage",
    "document:view", "document:manage",
    "report:view",
  ],
  VIEWER: [
    "business:view",
    "employee:view",
    "compliance:view",
    "payment:view",
    "document:view",
    "tax:view",
    "report:view",
  ],
};

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRolePermissions(role: MemberRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export class PermissionDeniedError extends Error {
  constructor(permission: Permission) {
    super(`Permission denied: ${permission}`);
    this.name = "PermissionDeniedError";
  }
}

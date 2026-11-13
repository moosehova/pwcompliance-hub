"use server";

import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, PermissionDeniedError, type Permission } from "@/lib/permissions";
import type { MemberRole } from "@prisma/client";

export interface OrgContext {
  userId: string;
  orgId: string;
  role: MemberRole;
  businessIds: string[];
}

export async function getOrgContext(): Promise<OrgContext> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;
  const cookieStore = await cookies();
  const activeOrgCookie = cookieStore.get("active-org-id")?.value;

  // Try to use the active org from cookie, fall back to first membership
  let membership = activeOrgCookie
    ? await prisma.organizationMember.findFirst({
        where: { userId, organizationId: activeOrgCookie },
      })
    : null;

  if (!membership) {
    membership = await prisma.organizationMember.findFirst({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
  }

  if (!membership) throw new Error("No organization membership found");

  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });

  return {
    userId,
    orgId: membership.organizationId,
    role: membership.role,
    businessIds: businesses.map((b) => b.id),
  };
}

export async function requirePermission(ctx: OrgContext, permission: Permission): Promise<void> {
  if (!hasPermission(ctx.role, permission)) {
    throw new PermissionDeniedError(permission);
  }
}

export async function getMyOrganizations() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    include: { organization: { select: { id: true, name: true, slug: true, logo: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function switchOrganization(orgId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Verify user is actually a member of the org
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, organizationId: orgId },
  });
  if (!membership) throw new Error("Not a member of this organization");

  const cookieStore = await cookies();
  cookieStore.set("active-org-id", orgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  return { success: true };
}

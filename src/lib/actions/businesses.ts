"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

async function getOrgId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) throw new Error("No organization");
  return { orgId: membership.organizationId, userId: session.user.id };
}

export async function getBusinesses() {
  const { orgId } = await getOrgId();
  return prisma.business.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      _count: { select: { employees: { where: { deletedAt: null, status: "ACTIVE" } }, obligations: true } },
    },
    orderBy: { legalName: "asc" },
  });
}

export async function getBusinessById(id: string) {
  const { orgId } = await getOrgId();
  return prisma.business.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      directors: true,
      shareholders: true,
      _count: {
        select: {
          employees: { where: { deletedAt: null, status: "ACTIVE" } },
          obligations: { where: { deletedAt: null } },
          payments: true,
          documents: { where: { deletedAt: null } },
        },
      },
    },
  });
}

const businessSchema = z.object({
  legalName: z.string().min(2),
  tradingName: z.string().optional(),
  businessType: z.enum(["PRIVATE_LIMITED", "PUBLIC_LIMITED", "SOLE_TRADER", "PARTNERSHIP", "NGO", "TRUST", "OTHER"]),
  industry: z.string().optional(),
  pacraNumber: z.string().optional(),
  tpin: z.string().optional(),
  napsaEmployerNo: z.string().optional(),
  nhimaEmployerNo: z.string().optional(),
  vatNumber: z.string().optional(),
  physicalAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().optional(),
  incorporatedDate: z.string().optional(),
  financialYearEnd: z.coerce.number().min(1).max(12).optional(),
});

export async function createBusiness(formData: unknown) {
  const { orgId, userId } = await getOrgId();
  const data = businessSchema.parse(formData);

  const business = await prisma.business.create({
    data: {
      ...data,
      organizationId: orgId,
      email: data.email || null,
      incorporatedDate: data.incorporatedDate ? new Date(data.incorporatedDate) : null,
    },
  });

  // Enable default requirements for all active authorities
  const requirements = await prisma.complianceRequirement.findMany({
    where: { active: true },
  });

  for (const req of requirements) {
    await prisma.businessRequirement.create({
      data: { businessId: business.id, requirementId: req.id, enabled: true },
    }).catch(() => {});
  }

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: business.id,
      action: "CREATE",
      entity: "Business",
      entityId: business.id,
      newValue: { legalName: business.legalName },
      description: `Created business: ${business.legalName}`,
    },
  });

  revalidatePath("/businesses");
  revalidatePath("/dashboard");
  return { success: true, id: business.id };
}

export async function updateBusiness(id: string, formData: unknown) {
  const { orgId, userId } = await getOrgId();
  const data = businessSchema.partial().parse(formData);

  const existing = await prisma.business.findFirst({ where: { id, organizationId: orgId } });
  if (!existing) throw new Error("Business not found");

  const business = await prisma.business.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      incorporatedDate: data.incorporatedDate ? new Date(data.incorporatedDate) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: id,
      action: "UPDATE",
      entity: "Business",
      entityId: id,
      oldValue: { legalName: existing.legalName },
      newValue: { legalName: business.legalName },
      description: `Updated business: ${business.legalName}`,
    },
  });

  revalidatePath("/businesses");
  revalidatePath(`/businesses/${id}`);
  return { success: true };
}

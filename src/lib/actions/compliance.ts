"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { computeObligationStatus } from "@/lib/utils";

async function getOrgContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
  });
  if (!membership) throw new Error("No organization");
  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  return { userId: session.user.id, orgId: membership.organizationId, businessIds: businesses.map((b) => b.id) };
}

export async function getObligations(params?: {
  businessId?: string;
  authorityCode?: string;
  status?: string;
}) {
  const { businessIds } = await getOrgContext();

  const obligations = await prisma.complianceObligation.findMany({
    where: {
      businessId: params?.businessId ? params.businessId : { in: businessIds },
      deletedAt: null,
      ...(params?.authorityCode && {
        authority: { code: params.authorityCode },
      }),
      ...(params?.status && params.status !== "ALL" && { status: params.status as never }),
    },
    include: {
      authority: true,
      business: { select: { legalName: true, tradingName: true } },
      requirement: { select: { name: true, frequency: true } },
      submissions: { orderBy: { createdAt: "desc" }, take: 1 },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });

  return obligations.map((o) => ({
    ...o,
    computedStatus: computeObligationStatus(o.dueDate, o.status),
  }));
}

export async function getObligationById(id: string) {
  const { businessIds } = await getOrgContext();
  return prisma.complianceObligation.findFirst({
    where: { id, businessId: { in: businessIds } },
    include: {
      authority: true,
      business: true,
      requirement: true,
      submissions: { include: { documents: true } },
      payments: { include: { receipts: true } },
      documents: true,
      reminders: true,
      auditLogs: { include: { user: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
}

const updateStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["UPCOMING", "DUE_SOON", "DUE", "OVERDUE", "SUBMITTED", "PENDING_PAYMENT", "PAID", "COMPLETED", "NOT_APPLICABLE", "CANCELLED"]),
  notes: z.string().optional(),
});

export async function updateObligationStatus(data: z.infer<typeof updateStatusSchema>) {
  const { businessIds, userId } = await getOrgContext();
  const parsed = updateStatusSchema.parse(data);

  const obligation = await prisma.complianceObligation.findFirst({
    where: { id: parsed.id, businessId: { in: businessIds } },
  });
  if (!obligation) throw new Error("Obligation not found");

  const updated = await prisma.complianceObligation.update({
    where: { id: parsed.id },
    data: { status: parsed.status, notes: parsed.notes ?? obligation.notes },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: obligation.businessId,
      obligationId: obligation.id,
      action: "UPDATE_STATUS",
      entity: "ComplianceObligation",
      entityId: obligation.id,
      oldValue: { status: obligation.status },
      newValue: { status: parsed.status },
      description: `Status changed to ${parsed.status}`,
    },
  });

  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  return updated;
}

export async function createObligation(data: {
  businessId: string;
  authorityId: string;
  requirementId: string;
  title: string;
  periodLabel: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  amountDue?: number;
  notes?: string;
}) {
  const { businessIds, userId } = await getOrgContext();
  if (!businessIds.includes(data.businessId)) throw new Error("Business not found");

  const obligation = await prisma.complianceObligation.create({ data });

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: data.businessId,
      obligationId: obligation.id,
      action: "CREATE",
      entity: "ComplianceObligation",
      entityId: obligation.id,
      newValue: { title: obligation.title },
      description: `Created obligation: ${obligation.title}`,
    },
  });

  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  return obligation;
}

export async function recordSubmission(data: {
  businessId: string;
  authorityId: string;
  obligationId: string;
  referenceNo: string;
  submittedAt: Date;
  method?: string;
  notes?: string;
}) {
  const { businessIds, userId } = await getOrgContext();
  if (!businessIds.includes(data.businessId)) throw new Error("Not found");

  const submission = await prisma.submission.create({
    data: {
      ...data,
      status: "SUBMITTED",
      submittedBy: userId,
    },
  });

  await prisma.complianceObligation.update({
    where: { id: data.obligationId },
    data: { status: "SUBMITTED" },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: data.businessId,
      obligationId: data.obligationId,
      action: "SUBMIT",
      entity: "Submission",
      entityId: submission.id,
      newValue: { referenceNo: data.referenceNo },
      description: `Recorded submission: Ref ${data.referenceNo}`,
    },
  });

  revalidatePath("/compliance");
  return submission;
}

export async function generateMonthlyObligations(businessId: string, year: number, month: number) {
  const { businessIds, userId } = await getOrgContext();
  if (!businessIds.includes(businessId)) throw new Error("Not found");

  const businessReqs = await prisma.businessRequirement.findMany({
    where: { businessId, enabled: true },
    include: { requirement: { include: { authority: true } } },
  });

  const created = [];
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);
  const monthLabel = periodStart.toLocaleDateString("en-ZM", { month: "long", year: "numeric" });

  for (const br of businessReqs) {
    const req = br.requirement;
    if (req.frequency !== "MONTHLY") continue;

    const dueDay = req.defaultDueDayOfMonth ?? 10;
    const dueDate = new Date(year, month, dueDay);

    const existing = await prisma.complianceObligation.findFirst({
      where: {
        businessId,
        requirementId: req.id,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
    });
    if (existing) continue;

    const obl = await prisma.complianceObligation.create({
      data: {
        businessId,
        authorityId: req.authorityId,
        requirementId: req.id,
        title: `${req.name} — ${monthLabel}`,
        periodLabel: monthLabel,
        periodStart,
        periodEnd,
        dueDate,
        status: "UPCOMING",
      },
    });
    created.push(obl);
  }

  if (created.length > 0) {
    await prisma.auditLog.create({
      data: {
        userId,
        businessId,
        action: "GENERATE",
        entity: "ComplianceObligation",
        newValue: { count: created.length, period: monthLabel },
        description: `Generated ${created.length} obligations for ${monthLabel}`,
      },
    });
  }

  revalidatePath("/compliance");
  revalidatePath("/dashboard");
  return created;
}

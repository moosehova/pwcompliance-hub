"use server";

import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/lib/session";
import { computeObligationStatus } from "@/lib/utils";

export async function getDashboardData() {
  const { orgId, userId } = await getOrgContext();

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organizationId: orgId },
    include: { organization: true },
  });
  if (!membership) throw new Error("No organization found");

  const businesses = await prisma.business.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, legalName: true, tradingName: true, status: true },
  });

  const businessIds = businesses.map((b) => b.id);

  const allObligations = await prisma.complianceObligation.findMany({
    where: { businessId: { in: businessIds }, deletedAt: null },
    include: { authority: true, business: true },
    orderBy: { dueDate: "asc" },
  });

  const now = new Date();
  const updatedObligations = allObligations.map((o) => ({
    ...o,
    computedStatus: computeObligationStatus(o.dueDate, o.status),
  }));

  const overdue = updatedObligations.filter((o) => o.computedStatus === "OVERDUE");
  const dueSoon = updatedObligations.filter(
    (o) => o.computedStatus === "DUE_SOON" || o.computedStatus === "DUE"
  );
  const upcoming = updatedObligations.filter((o) => o.computedStatus === "UPCOMING");
  const completed = updatedObligations.filter((o) =>
    ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus)
  );

  // Compliance score per authority
  const authorities = await prisma.authority.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const authorityScores = authorities.map((auth) => {
    const authObls = updatedObligations.filter((o) => o.authorityId === auth.id);
    if (authObls.length === 0) return { authority: auth, score: null, total: 0, completed: 0 };
    const done = authObls.filter((o) =>
      ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus)
    ).length;
    const score = Math.round((done / authObls.length) * 100);
    return { authority: auth, score, total: authObls.length, completed: done };
  });

  const totalObls = updatedObligations.length;
  const totalCompleted = completed.length;
  const overallScore = totalObls > 0 ? Math.round((totalCompleted / totalObls) * 100) : 100;

  // Recent payments
  const recentPayments = await prisma.payment.findMany({
    where: { businessId: { in: businessIds } },
    include: { authority: true, business: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Expiring documents
  const expiringDocs = await prisma.document.findMany({
    where: {
      businessId: { in: businessIds },
      deletedAt: null,
      expiryDate: { gte: now, lte: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000) },
    },
    include: { business: true },
    orderBy: { expiryDate: "asc" },
    take: 5,
  });

  const totalEmployees = await prisma.employee.count({
    where: { businessId: { in: businessIds }, status: "ACTIVE", deletedAt: null },
  });

  return {
    organization: membership.organization,
    businesses,
    overallScore,
    authorityScores,
    stats: {
      businesses: businesses.length,
      employees: totalEmployees,
      overdue: overdue.length,
      dueSoon: dueSoon.length,
      upcoming: upcoming.length,
      completed: completed.length,
      total: totalObls,
    },
    overdueObligations: overdue.slice(0, 10),
    dueSoonObligations: dueSoon.slice(0, 10),
    recentPayments,
    expiringDocs,
  };
}

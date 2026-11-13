"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { getOrgContext, requirePermission } from "@/lib/session";
import { computeTurnoverTax } from "@/lib/tot-computation";

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTotReturns(params?: {
  businessId?: string;
  taxYear?: number;
  status?: string;
}) {
  const { orgId } = await getOrgContext();

  return prisma.taxReturn.findMany({
    where: {
      organizationId: orgId,
      taxType: "TURNOVER_TAX",
      deletedAt: null,
      ...(params?.businessId && { businessId: params.businessId }),
      ...(params?.taxYear && { taxYear: params.taxYear }),
      ...(params?.status && params.status !== "ALL" && { status: params.status as never }),
    },
    include: {
      business: { select: { legalName: true, tradingName: true } },
      preparer: { select: { name: true, email: true } },
      turnoverComputation: true,
    },
    orderBy: [{ taxYear: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTotReturnById(id: string) {
  const { orgId } = await getOrgContext();

  return prisma.taxReturn.findFirst({
    where: { id, organizationId: orgId, taxType: "TURNOVER_TAX", deletedAt: null },
    include: {
      business: true,
      preparer: { select: { name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      taxRule: true,
      turnoverComputation: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      reviews: {
        include: { reviewer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// ─── Eligibility ──────────────────────────────────────────────────────────────

const EligibilitySchema = z.object({
  taxReturnId: z.string(),
  annualTurnoverCheck: z.boolean(),
  notVatRegistered: z.boolean(),
  eligibilityNotes: z.string().optional(),
});

export async function saveTotEligibility(data: z.infer<typeof EligibilitySchema>) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const parsed = EligibilitySchema.parse(data);

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: parsed.taxReturnId, organizationId: ctx.orgId, taxType: "TURNOVER_TAX" },
  });
  if (!taxReturn) throw new Error("Tax return not found");

  const eligibilityChecked = parsed.annualTurnoverCheck && parsed.notVatRegistered;

  await prisma.turnoverTaxComputation.upsert({
    where: { taxReturnId: parsed.taxReturnId },
    update: {
      annualTurnoverCheck: parsed.annualTurnoverCheck,
      notVatRegistered: parsed.notVatRegistered,
      eligibilityChecked,
      eligibilityNotes: parsed.eligibilityNotes,
    },
    create: {
      taxReturnId: parsed.taxReturnId,
      annualTurnoverCheck: parsed.annualTurnoverCheck,
      notVatRegistered: parsed.notVatRegistered,
      eligibilityChecked,
      eligibilityNotes: parsed.eligibilityNotes,
    },
  });

  revalidatePath(`/tax/turnover/${parsed.taxReturnId}`);
  return { success: true };
}

// ─── Computation ──────────────────────────────────────────────────────────────

const ComputationSchema = z.object({
  taxReturnId: z.string(),
  grossTurnover: z.number().min(0),
  exportSales: z.number().min(0).default(0),
  dividendIncome: z.number().min(0).default(0),
  interestIncome: z.number().min(0).default(0),
  rentalIncome: z.number().min(0).default(0),
  capitalGains: z.number().min(0).default(0),
  otherExclusions: z.number().min(0).default(0),
  exclusionNotes: z.string().optional(),
  quarterlyPayments: z.number().min(0).default(0),
  whtCredits: z.number().min(0).default(0),
  otherCredits: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function saveTotComputation(data: z.infer<typeof ComputationSchema>) {
  const session = await auth();
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const parsed = ComputationSchema.parse(data);

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: parsed.taxReturnId, organizationId: ctx.orgId, taxType: "TURNOVER_TAX" },
    include: { taxRule: true },
  });
  if (!taxReturn) throw new Error("Tax return not found");

  // Rate must come from a TaxRule — never hard-coded
  if (!taxReturn.taxRule?.flatRate) {
    throw new Error(
      "No verified TOT rate found for this return. Add a Turnover Tax rule with a flat rate first."
    );
  }

  const taxRate = Number(taxReturn.taxRule.flatRate);

  const result = computeTurnoverTax({
    grossTurnover: parsed.grossTurnover,
    exportSales: parsed.exportSales,
    dividendIncome: parsed.dividendIncome,
    interestIncome: parsed.interestIncome,
    rentalIncome: parsed.rentalIncome,
    capitalGains: parsed.capitalGains,
    otherExclusions: parsed.otherExclusions,
    taxRate,
    quarterlyPayments: parsed.quarterlyPayments,
    whtCredits: parsed.whtCredits,
    otherCredits: parsed.otherCredits,
  });

  const taxRuleSnapshot = {
    id: taxReturn.taxRule.id,
    name: taxReturn.taxRule.name,
    flatRate: taxRate,
    effectiveFrom: taxReturn.taxRule.effectiveFrom,
    source: taxReturn.taxRule.source,
    isDraft: taxReturn.taxRule.isDraft,
  };

  await prisma.turnoverTaxComputation.upsert({
    where: { taxReturnId: parsed.taxReturnId },
    update: {
      grossTurnover: parsed.grossTurnover,
      exportSales: parsed.exportSales,
      dividendIncome: parsed.dividendIncome,
      interestIncome: parsed.interestIncome,
      rentalIncome: parsed.rentalIncome,
      capitalGains: parsed.capitalGains,
      otherExclusions: parsed.otherExclusions,
      exclusionNotes: parsed.exclusionNotes,
      totalExclusions: result.totalExclusions,
      taxableTurnover: result.taxableTurnover,
      taxRate,
      taxLiability: result.taxLiability,
      quarterlyPayments: parsed.quarterlyPayments,
      whtCredits: parsed.whtCredits,
      otherCredits: parsed.otherCredits,
      totalCredits: result.totalCredits,
      netTaxPayable: result.netTaxPayable,
      taxRefundable: result.taxRefundable,
      taxRuleSnapshot,
      notes: parsed.notes,
    },
    create: {
      taxReturnId: parsed.taxReturnId,
      grossTurnover: parsed.grossTurnover,
      exportSales: parsed.exportSales,
      dividendIncome: parsed.dividendIncome,
      interestIncome: parsed.interestIncome,
      rentalIncome: parsed.rentalIncome,
      capitalGains: parsed.capitalGains,
      otherExclusions: parsed.otherExclusions,
      exclusionNotes: parsed.exclusionNotes,
      totalExclusions: result.totalExclusions,
      taxableTurnover: result.taxableTurnover,
      taxRate,
      taxLiability: result.taxLiability,
      quarterlyPayments: parsed.quarterlyPayments,
      whtCredits: parsed.whtCredits,
      otherCredits: parsed.otherCredits,
      totalCredits: result.totalCredits,
      netTaxPayable: result.netTaxPayable,
      taxRefundable: result.taxRefundable,
      taxRuleSnapshot,
      notes: parsed.notes,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session?.user?.id,
      organizationId: ctx.orgId,
      businessId: taxReturn.businessId,
      taxReturnId: parsed.taxReturnId,
      action: "UPDATE",
      entity: "TurnoverTaxComputation",
      entityId: parsed.taxReturnId,
      newValue: { taxRate, taxLiability: result.taxLiability, netTaxPayable: result.netTaxPayable },
      description: `TOT computation saved: taxable turnover ${result.taxableTurnover}, liability ${result.taxLiability}`,
    },
  });

  if (taxReturn.status === "DRAFT") {
    await prisma.taxReturn.update({
      where: { id: parsed.taxReturnId },
      data: { status: "PREPARED" },
    });
  }

  revalidatePath(`/tax/turnover/${parsed.taxReturnId}`);
  revalidatePath(`/tax/turnover`);
  return { success: true, result };
}

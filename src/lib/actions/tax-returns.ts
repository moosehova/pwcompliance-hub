"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrgContext, requirePermission } from "@/lib/session";
import { computeTax } from "@/lib/tax-computation";
import type { TaxReturnStatus, TaxReturnReviewAction } from "@prisma/client";

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getTaxReturns(params?: {
  businessId?: string;
  taxType?: string;
  taxYear?: number;
  status?: string;
}) {
  const { orgId } = await getOrgContext();

  return prisma.taxReturn.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(params?.businessId && { businessId: params.businessId }),
      ...(params?.taxType && { taxType: params.taxType as never }),
      ...(params?.taxYear && { taxYear: params.taxYear }),
      ...(params?.status && params.status !== "ALL" && { status: params.status as TaxReturnStatus }),
    },
    include: {
      business: { select: { legalName: true, tradingName: true } },
      preparer: { select: { name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
    },
    orderBy: [{ taxYear: "desc" }, { createdAt: "desc" }],
  });
}

export async function getTaxReturnById(id: string) {
  const { orgId } = await getOrgContext();

  return prisma.taxReturn.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      business: true,
      preparer: { select: { name: true, email: true } },
      reviewer: { select: { name: true, email: true } },
      approvedBy: { select: { name: true, email: true } },
      taxRule: true,
      balanceSheet: true,
      incomeStatement: true,
      computation: true,
      fixedAssets: { orderBy: { createdAt: "asc" } },
      taxAdjustments: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
      taxLosses: true,
      documents: { where: { deletedAt: null }, orderBy: { createdAt: "desc" } },
      reviews: {
        include: { reviewer: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getTaxReturnStats() {
  const { orgId } = await getOrgContext();

  const [total, draft, prepared, underReview, approved, submitted, completed] = await Promise.all([
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null, status: "DRAFT" } }),
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null, status: "PREPARED" } }),
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null, status: "UNDER_REVIEW" } }),
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null, status: "APPROVED" } }),
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null, status: "SUBMITTED" } }),
    prisma.taxReturn.count({ where: { organizationId: orgId, deletedAt: null, status: "COMPLETED" } }),
  ]);

  return { total, draft, prepared, underReview, approved, submitted, completed };
}

// ─── Create ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  businessId: z.string().min(1),
  taxType: z.enum(["COMPANY_INCOME_TAX", "TURNOVER_TAX", "VAT", "PAYE", "WITHHOLDING_TAX"]),
  taxYear: z.coerce.number().min(2000).max(2100),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  financialYearStart: z.string().optional(),
  financialYearEnd: z.string().optional(),
  notes: z.string().optional(),
});

export async function createTaxReturn(formData: unknown) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");
  const { orgId, userId, businessIds } = ctx;

  const data = createSchema.parse(formData);

  if (!businessIds.includes(data.businessId)) {
    throw new Error("Business not found");
  }

  // Check for existing non-amended return for same business/type/year
  const existing = await prisma.taxReturn.findFirst({
    where: {
      businessId: data.businessId,
      taxType: data.taxType,
      taxYear: data.taxYear,
      isAmended: false,
      deletedAt: null,
    },
  });
  if (existing) {
    throw new Error(`A ${data.taxType} return for ${data.taxYear} already exists. Create an amended return instead.`);
  }

  const taxReturn = await prisma.taxReturn.create({
    data: {
      organizationId: orgId,
      businessId: data.businessId,
      taxType: data.taxType,
      taxYear: data.taxYear,
      periodStart: new Date(data.periodStart),
      periodEnd: new Date(data.periodEnd),
      financialYearStart: data.financialYearStart ? new Date(data.financialYearStart) : null,
      financialYearEnd: data.financialYearEnd ? new Date(data.financialYearEnd) : null,
      preparerId: userId,
      status: "DRAFT",
      notes: data.notes,
    },
  });

  // Create empty section records
  await Promise.all([
    prisma.taxReturnBalanceSheet.create({ data: { taxReturnId: taxReturn.id } }),
    prisma.taxReturnIncomeStatement.create({ data: { taxReturnId: taxReturn.id } }),
    prisma.taxReturnComputation.create({ data: { taxReturnId: taxReturn.id } }),
  ]);

  await prisma.auditLog.create({
    data: {
      userId,
      organizationId: orgId,
      businessId: data.businessId,
      taxReturnId: taxReturn.id,
      action: "CREATE",
      entity: "TaxReturn",
      entityId: taxReturn.id,
      newValue: { taxType: data.taxType, taxYear: data.taxYear },
      description: `Created ${data.taxType} return for ${data.taxYear}`,
    },
  });

  revalidatePath("/tax");
  return { success: true, id: taxReturn.id };
}

// ─── Balance Sheet ────────────────────────────────────────────────────────────

export async function updateBalanceSheet(taxReturnId: string, formData: unknown) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: taxReturnId, organizationId: ctx.orgId, deletedAt: null },
  });
  if (!taxReturn) throw new Error("Tax return not found");
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status)) {
    throw new Error("Return is locked — only DRAFT or CHANGES_REQUESTED returns can be edited");
  }

  const data = formData as Record<string, unknown>;

  // Compute subtotals server-side
  const toDecimal = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

  const ppe = toDecimal(data.ppe);
  const intangibleAssets = toDecimal(data.intangibleAssets);
  const longTermInvestments = toDecimal(data.longTermInvestments);
  const otherNonCurrentAssets = toDecimal(data.otherNonCurrentAssets);
  const totalNonCurrentAssets = ppe + intangibleAssets + longTermInvestments + otherNonCurrentAssets;

  const inventory = toDecimal(data.inventory);
  const tradeReceivables = toDecimal(data.tradeReceivables);
  const otherReceivables = toDecimal(data.otherReceivables);
  const cashAndBank = toDecimal(data.cashAndBank);
  const otherCurrentAssets = toDecimal(data.otherCurrentAssets);
  const totalCurrentAssets = inventory + tradeReceivables + otherReceivables + cashAndBank + otherCurrentAssets;

  const totalAssets = totalNonCurrentAssets + totalCurrentAssets;

  const tradePayables = toDecimal(data.tradePayables);
  const taxLiabilitiesCurrent = toDecimal(data.taxLiabilitiesCurrent);
  const currentBorrowings = toDecimal(data.currentBorrowings);
  const otherCurrentLiabilities = toDecimal(data.otherCurrentLiabilities);
  const totalCurrentLiabilities = tradePayables + taxLiabilitiesCurrent + currentBorrowings + otherCurrentLiabilities;

  const longTermBorrowings = toDecimal(data.longTermBorrowings);
  const deferredTax = toDecimal(data.deferredTax);
  const otherNonCurrentLiabilities = toDecimal(data.otherNonCurrentLiabilities);
  const totalNonCurrentLiabilities = longTermBorrowings + deferredTax + otherNonCurrentLiabilities;

  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  const shareCapital = toDecimal(data.shareCapital);
  const sharePremium = toDecimal(data.sharePremium);
  const retainedEarnings = toDecimal(data.retainedEarnings);
  const otherEquity = toDecimal(data.otherEquity);
  const totalEquity = shareCapital + sharePremium + retainedEarnings + otherEquity;

  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  await prisma.taxReturnBalanceSheet.upsert({
    where: { taxReturnId },
    create: {
      taxReturnId,
      ppe, intangibleAssets, longTermInvestments, otherNonCurrentAssets, totalNonCurrentAssets,
      inventory, tradeReceivables, otherReceivables, cashAndBank, otherCurrentAssets, totalCurrentAssets,
      totalAssets,
      tradePayables, taxLiabilitiesCurrent, currentBorrowings, otherCurrentLiabilities, totalCurrentLiabilities,
      longTermBorrowings, deferredTax, otherNonCurrentLiabilities, totalNonCurrentLiabilities,
      totalLiabilities,
      shareCapital, sharePremium: toDecimal(data.sharePremium), retainedEarnings, otherEquity, totalEquity,
      totalLiabilitiesAndEquity,
    },
    update: {
      ppe, intangibleAssets, longTermInvestments, otherNonCurrentAssets, totalNonCurrentAssets,
      inventory, tradeReceivables, otherReceivables, cashAndBank, otherCurrentAssets, totalCurrentAssets,
      totalAssets,
      tradePayables, taxLiabilitiesCurrent, currentBorrowings, otherCurrentLiabilities, totalCurrentLiabilities,
      longTermBorrowings, deferredTax, otherNonCurrentLiabilities, totalNonCurrentLiabilities,
      totalLiabilities,
      shareCapital, sharePremium: toDecimal(data.sharePremium), retainedEarnings, otherEquity, totalEquity,
      totalLiabilitiesAndEquity,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      businessId: taxReturn.businessId,
      taxReturnId,
      action: "UPDATE",
      entity: "TaxReturnBalanceSheet",
      entityId: taxReturnId,
      description: "Updated balance sheet",
    },
  });

  revalidatePath(`/tax/returns/${taxReturnId}`);
  return { success: true };
}

// ─── Income Statement ─────────────────────────────────────────────────────────

export async function updateIncomeStatement(taxReturnId: string, formData: unknown) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: taxReturnId, organizationId: ctx.orgId, deletedAt: null },
  });
  if (!taxReturn) throw new Error("Tax return not found");
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status)) {
    throw new Error("Return is locked");
  }

  const data = formData as Record<string, unknown>;
  const toD = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

  const turnover = toD(data.turnover);
  const otherOperatingIncome = toD(data.otherOperatingIncome);
  const totalRevenue = turnover + otherOperatingIncome;

  const costOfSales = toD(data.costOfSales);
  const grossProfit = totalRevenue - costOfSales;

  const adminExpenses = toD(data.adminExpenses);
  const sellingExpenses = toD(data.sellingExpenses);
  const depreciation = toD(data.depreciation);
  const financeCharges = toD(data.financeCharges);
  const otherExpenses = toD(data.otherExpenses);
  const totalExpenses = adminExpenses + sellingExpenses + depreciation + financeCharges + otherExpenses;

  const profitBeforeTax = grossProfit - totalExpenses;
  const taxExpense = toD(data.taxExpense);
  const profitAfterTax = profitBeforeTax - taxExpense;

  await prisma.taxReturnIncomeStatement.upsert({
    where: { taxReturnId },
    create: {
      taxReturnId,
      turnover, otherOperatingIncome, totalRevenue,
      costOfSales, grossProfit,
      adminExpenses, sellingExpenses, depreciation, financeCharges, otherExpenses, totalExpenses,
      profitBeforeTax, taxExpense, profitAfterTax,
    },
    update: {
      turnover, otherOperatingIncome, totalRevenue,
      costOfSales, grossProfit,
      adminExpenses, sellingExpenses, depreciation, financeCharges, otherExpenses, totalExpenses,
      profitBeforeTax, taxExpense, profitAfterTax,
    },
  });

  // Keep computation accounting profit in sync
  await prisma.taxReturnComputation.updateMany({
    where: { taxReturnId },
    data: { accountingProfit: profitBeforeTax },
  });

  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      businessId: taxReturn.businessId,
      taxReturnId,
      action: "UPDATE",
      entity: "TaxReturnIncomeStatement",
      entityId: taxReturnId,
      description: "Updated income statement",
    },
  });

  revalidatePath(`/tax/returns/${taxReturnId}`);
  return { success: true, profitBeforeTax };
}

// ─── Tax Computation ──────────────────────────────────────────────────────────

export async function updateTaxComputation(taxReturnId: string, formData: unknown) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: taxReturnId, organizationId: ctx.orgId, deletedAt: null },
    include: { incomeStatement: true },
  });
  if (!taxReturn) throw new Error("Tax return not found");
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status)) {
    throw new Error("Return is locked");
  }

  const data = formData as Record<string, unknown>;
  const toD = (v: unknown) => parseFloat(String(v ?? 0)) || 0;

  // Get approved tax rule for this return's tax year and type
  const taxRule = await prisma.taxRule.findFirst({
    where: {
      taxType: taxReturn.taxType,
      active: true,
      isDraft: false,
      effectiveFrom: { lte: taxReturn.periodEnd },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: taxReturn.periodStart } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  const accountingProfit = toD(taxReturn.incomeStatement?.profitBeforeTax ?? data.accountingProfit);

  const addbackDepreciation = toD(data.addbackDepreciation);
  const addbackEntertainment = toD(data.addbackEntertainment);
  const addbackFines = toD(data.addbackFines);
  const addbackOther = toD(data.addbackOther);
  const capitalAllowances = toD(data.capitalAllowances);
  const otherAllowableDeductions = toD(data.otherAllowableDeductions);
  const lossesUtilised = toD(data.lossesUtilised);

  // Apply tax rate from verified rule (or manual override if rule not available)
  let taxRate = toD(data.taxRate);
  let taxRuleSnapshot = null;

  if (taxRule) {
    if (taxRule.flatRate) {
      taxRate = Number(taxRule.flatRate);
    }
    taxRuleSnapshot = {
      ruleId: taxRule.id,
      name: taxRule.name,
      taxType: taxRule.taxType,
      flatRate: taxRule.flatRate,
      brackets: taxRule.brackets,
      effectiveFrom: taxRule.effectiveFrom,
      effectiveTo: taxRule.effectiveTo,
    };
  }

  const taxCredits = toD(data.taxCredits);
  const advanceTaxPaid = toD(data.advanceTaxPaid);
  const whtCredits = toD(data.whtCredits);

  const {
    totalAddbacks,
    totalDeductions,
    taxableProfit,
    grossTaxLiability,
    totalCredits,
    netTaxPayable,
    taxRefundable,
  } = computeTax({
    accountingProfit,
    addbackDepreciation, addbackEntertainment, addbackFines, addbackOther,
    capitalAllowances, otherAllowableDeductions,
    lossesUtilised,
    taxRate,
    taxCredits, advanceTaxPaid, whtCredits,
  });

  await prisma.taxReturnComputation.upsert({
    where: { taxReturnId },
    create: {
      taxReturnId, accountingProfit,
      addbackDepreciation, addbackEntertainment, addbackFines, addbackOther, totalAddbacks,
      capitalAllowances, otherAllowableDeductions, totalDeductions,
      lossesUtilised, taxableProfit,
      taxRate, grossTaxLiability,
      taxCredits, advanceTaxPaid, whtCredits, totalCredits,
      netTaxPayable, taxRefundable,
      taxRuleSnapshot: taxRuleSnapshot ?? undefined,
      notes: data.notes as string | undefined,
    },
    update: {
      accountingProfit,
      addbackDepreciation, addbackEntertainment, addbackFines, addbackOther, totalAddbacks,
      capitalAllowances, otherAllowableDeductions, totalDeductions,
      lossesUtilised, taxableProfit,
      taxRate, grossTaxLiability,
      taxCredits, advanceTaxPaid, whtCredits, totalCredits,
      netTaxPayable, taxRefundable,
      taxRuleSnapshot: taxRuleSnapshot ?? undefined,
      notes: data.notes as string | undefined,
    },
  });

  // Update taxRuleId on the return
  await prisma.taxReturn.update({
    where: { id: taxReturnId },
    data: { taxRuleId: taxRule?.id ?? undefined },
  });

  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      businessId: taxReturn.businessId,
      taxReturnId,
      action: "UPDATE",
      entity: "TaxReturnComputation",
      entityId: taxReturnId,
      newValue: { taxableProfit, netTaxPayable, taxRate },
      description: `Updated tax computation — taxable profit: ${taxableProfit}, tax payable: ${netTaxPayable}`,
    },
  });

  revalidatePath(`/tax/returns/${taxReturnId}`);
  return { success: true, taxableProfit, netTaxPayable, taxRefundable, taxRuleUsed: taxRule?.name };
}

// ─── Fixed Assets ─────────────────────────────────────────────────────────────

const assetSchema = z.object({
  description: z.string().min(1),
  assetCategory: z.enum(["INDUSTRIAL_BUILDING", "COMMERCIAL_BUILDING", "PLANT_MACHINERY", "MOTOR_VEHICLE", "COMPUTER_EQUIPMENT", "FURNITURE_FITTINGS", "OTHER"]),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.coerce.number().min(0),
  businessUsePercent: z.coerce.number().min(0).max(100).default(100),
  qualifyingCost: z.coerce.number().min(0).optional(),
  disposalDate: z.string().optional(),
  disposalProceeds: z.coerce.number().optional(),
  taxWdvBrought: z.coerce.number().min(0).default(0),
  allowanceRate: z.coerce.number().min(0).max(100),
  accountingDepreciation: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function addFixedAsset(taxReturnId: string, formData: unknown) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: taxReturnId, organizationId: ctx.orgId, deletedAt: null },
  });
  if (!taxReturn) throw new Error("Tax return not found");
  if (!["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status)) {
    throw new Error("Tax return cannot be modified in its current status");
  }

  const data = assetSchema.parse(formData);

  // qualifying cost = acquisition cost × business use %
  const qualifyingCost = data.qualifyingCost ?? (data.acquisitionCost * data.businessUsePercent) / 100;

  // Capital allowance = max of WDV b/f or qualifying cost (new asset), × rate
  const base = data.taxWdvBrought > 0 ? data.taxWdvBrought : qualifyingCost;
  const calculatedAllowance = (base * data.allowanceRate) / 100;
  const taxWdvCarried = Math.max(0, base - calculatedAllowance - (data.disposalProceeds ?? 0));

  const asset = await prisma.fixedAsset.create({
    data: {
      taxReturnId,
      businessId: taxReturn.businessId,
      description: data.description,
      assetCategory: data.assetCategory,
      acquisitionDate: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
      acquisitionCost: data.acquisitionCost,
      businessUsePercent: data.businessUsePercent,
      qualifyingCost,
      disposalDate: data.disposalDate ? new Date(data.disposalDate) : null,
      disposalProceeds: data.disposalProceeds ?? null,
      taxWdvBrought: data.taxWdvBrought,
      allowanceRate: data.allowanceRate,
      calculatedAllowance,
      taxWdvCarried,
      accountingDepreciation: data.accountingDepreciation,
      notes: data.notes,
    },
  });

  revalidatePath(`/tax/returns/${taxReturnId}`);
  return { success: true, id: asset.id, calculatedAllowance };
}

export async function deleteFixedAsset(assetId: string) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const asset = await prisma.fixedAsset.findFirst({
    where: { id: assetId },
    include: { taxReturn: { select: { organizationId: true, id: true } } },
  });
  if (!asset || asset.taxReturn.organizationId !== ctx.orgId) throw new Error("Asset not found");

  await prisma.fixedAsset.delete({ where: { id: assetId } });
  revalidatePath(`/tax/returns/${asset.taxReturn.id}`);
  return { success: true };
}

// ─── Tax Adjustments ──────────────────────────────────────────────────────────

export async function addTaxAdjustment(taxReturnId: string, formData: unknown) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const schema = z.object({
    type: z.enum(["ADDBACK", "DEDUCTION"]),
    description: z.string().min(1),
    amount: z.coerce.number().min(0),
    reference: z.string().optional(),
    notes: z.string().optional(),
  });

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: taxReturnId, organizationId: ctx.orgId, deletedAt: null },
  });
  if (!taxReturn) throw new Error("Tax return not found");

  const data = schema.parse(formData);
  const adj = await prisma.taxAdjustment.create({
    data: { taxReturnId, ...data },
  });

  revalidatePath(`/tax/returns/${taxReturnId}`);
  return { success: true, id: adj.id };
}

export async function deleteTaxAdjustment(adjustmentId: string) {
  const ctx = await getOrgContext();
  await requirePermission(ctx, "tax:prepare");

  const adj = await prisma.taxAdjustment.findFirst({
    where: { id: adjustmentId },
    include: { taxReturn: { select: { organizationId: true, id: true } } },
  });
  if (!adj || adj.taxReturn.organizationId !== ctx.orgId) throw new Error("Not found");

  await prisma.taxAdjustment.delete({ where: { id: adjustmentId } });
  revalidatePath(`/tax/returns/${adj.taxReturn.id}`);
  return { success: true };
}

// ─── Status / Workflow ────────────────────────────────────────────────────────

export async function updateTaxReturnStatus(
  taxReturnId: string,
  action: TaxReturnReviewAction,
  notes?: string,
) {
  const ctx = await getOrgContext();

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id: taxReturnId, organizationId: ctx.orgId, deletedAt: null },
  });
  if (!taxReturn) throw new Error("Tax return not found");

  const statusMap: Record<TaxReturnReviewAction, { from: TaxReturnStatus[]; to: TaxReturnStatus; permission: "tax:prepare" | "tax:review" | "tax:approve" | "tax:submit" }> = {
    SUBMIT_FOR_REVIEW: { from: ["DRAFT", "CHANGES_REQUESTED"], to: "UNDER_REVIEW", permission: "tax:prepare" },
    APPROVE: { from: ["UNDER_REVIEW"], to: "APPROVED", permission: "tax:approve" },
    REQUEST_CHANGES: { from: ["UNDER_REVIEW"], to: "CHANGES_REQUESTED", permission: "tax:review" },
    SUBMIT_TO_ZRA: { from: ["APPROVED"], to: "SUBMITTED", permission: "tax:submit" },
    COMPLETE: { from: ["SUBMITTED"], to: "COMPLETED", permission: "tax:approve" },
  };

  const transition = statusMap[action];
  if (!transition.from.includes(taxReturn.status as TaxReturnStatus)) {
    throw new Error(`Cannot ${action} a return in ${taxReturn.status} status`);
  }
  await requirePermission(ctx, transition.permission);

  await prisma.taxReturn.update({
    where: { id: taxReturnId },
    data: {
      status: transition.to,
      ...(action === "APPROVE" && { approvedAt: new Date(), approvedById: ctx.userId }),
      ...(action === "SUBMIT_TO_ZRA" && { submittedAt: new Date(), filedById: ctx.userId }),
    },
  });

  await prisma.taxReturnReview.create({
    data: { taxReturnId, reviewerId: ctx.userId, action, notes },
  });

  await prisma.auditLog.create({
    data: {
      userId: ctx.userId,
      organizationId: ctx.orgId,
      businessId: taxReturn.businessId,
      taxReturnId,
      action,
      entity: "TaxReturn",
      entityId: taxReturnId,
      oldValue: { status: taxReturn.status },
      newValue: { status: transition.to },
      description: `Tax return status changed: ${taxReturn.status} → ${transition.to}`,
    },
  });

  revalidatePath(`/tax/returns/${taxReturnId}`);
  revalidatePath("/tax");
  return { success: true, newStatus: transition.to };
}

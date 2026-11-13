/**
 * Unit tests for the tax computation engine (computeTax).
 *
 * ⚠️  IMPORTANT: The tax rate figures used below are ILLUSTRATIVE ONLY.
 * They do not represent current or historical Zambian tax law.
 * Before using these tests in a production context, replace the rates with
 * rates verified against official ZRA publications or qualified tax advice.
 */

import { describe, it, expect } from "vitest";
import { computeTax } from "@/lib/tax-computation";

// ─── Base fixture (ILLUSTRATIVE — not official Zambian rates) ─────────────────

const BASE = {
  accountingProfit: 1_000_000,
  addbackDepreciation: 50_000,
  addbackEntertainment: 10_000,
  addbackFines: 5_000,
  addbackOther: 15_000,
  capitalAllowances: 80_000,
  otherAllowableDeductions: 20_000,
  lossesUtilised: 0,
  taxRate: 30, // ILLUSTRATIVE — verify against official ZRA rate
  taxCredits: 0,
  advanceTaxPaid: 0,
  whtCredits: 0,
};

// BASE expected values:
// totalAddbacks = 80_000
// totalDeductions = 100_000
// taxableProfit = 1_000_000 + 80_000 - 100_000 = 980_000
// grossTaxLiability = 980_000 * 0.30 = 294_000
// netTaxPayable = 294_000

// ─── Addbacks ─────────────────────────────────────────────────────────────────

describe("addbacks", () => {
  it("sums all four addback categories", () => {
    const { totalAddbacks } = computeTax(BASE);
    expect(totalAddbacks).toBe(80_000);
  });

  it("zero addbacks when all inputs are zero", () => {
    const { totalAddbacks } = computeTax({ ...BASE, addbackDepreciation: 0, addbackEntertainment: 0, addbackFines: 0, addbackOther: 0 });
    expect(totalAddbacks).toBe(0);
  });
});

// ─── Deductions ───────────────────────────────────────────────────────────────

describe("deductions", () => {
  it("sums capital allowances and other allowable deductions", () => {
    const { totalDeductions } = computeTax(BASE);
    expect(totalDeductions).toBe(100_000);
  });
});

// ─── Taxable profit ───────────────────────────────────────────────────────────

describe("taxable profit", () => {
  it("equals accounting profit + addbacks - deductions - losses utilised", () => {
    const { taxableProfit } = computeTax(BASE);
    expect(taxableProfit).toBe(980_000);
  });

  it("reduces when losses are utilised", () => {
    const { taxableProfit } = computeTax({ ...BASE, lossesUtilised: 200_000 });
    expect(taxableProfit).toBe(780_000);
  });

  it("can be negative (loss-making period)", () => {
    const { taxableProfit } = computeTax({ ...BASE, accountingProfit: -500_000 });
    expect(taxableProfit).toBeLessThan(0);
  });
});

// ─── Gross tax liability ──────────────────────────────────────────────────────

describe("gross tax liability", () => {
  it("is taxableProfit × rate / 100 when profit is positive (ILLUSTRATIVE 30% rate)", () => {
    const { grossTaxLiability } = computeTax(BASE);
    expect(grossTaxLiability).toBeCloseTo(294_000, 2);
  });

  it("is zero when taxable profit is zero", () => {
    const profit = BASE.addbackDepreciation + BASE.addbackEntertainment + BASE.addbackFines + BASE.addbackOther
      - BASE.capitalAllowances - BASE.otherAllowableDeductions;
    const { grossTaxLiability } = computeTax({ ...BASE, accountingProfit: -profit });
    expect(grossTaxLiability).toBe(0);
  });

  it("is zero when taxable profit is negative (never negative tax)", () => {
    const { grossTaxLiability } = computeTax({ ...BASE, accountingProfit: -2_000_000 });
    expect(grossTaxLiability).toBe(0);
  });

  it("scales with tax rate (ILLUSTRATIVE)", () => {
    const r15 = computeTax({ ...BASE, taxRate: 15 });
    const r30 = computeTax({ ...BASE, taxRate: 30 });
    expect(r30.grossTaxLiability).toBeCloseTo(r15.grossTaxLiability * 2, 2);
  });
});

// ─── Credits ─────────────────────────────────────────────────────────────────

describe("credits", () => {
  it("sums taxCredits + advanceTaxPaid + whtCredits", () => {
    const { totalCredits } = computeTax({
      ...BASE,
      taxCredits: 10_000,
      advanceTaxPaid: 20_000,
      whtCredits: 5_000,
    });
    expect(totalCredits).toBe(35_000);
  });
});

// ─── Net tax payable ──────────────────────────────────────────────────────────

describe("net tax payable", () => {
  it("equals grossTaxLiability minus totalCredits when credits < liability", () => {
    const { netTaxPayable } = computeTax({ ...BASE, advanceTaxPaid: 50_000 });
    expect(netTaxPayable).toBeCloseTo(244_000, 2); // 294_000 - 50_000
  });

  it("is zero when credits equal liability (fully offset)", () => {
    const { netTaxPayable } = computeTax({ ...BASE, advanceTaxPaid: 294_000 });
    expect(netTaxPayable).toBe(0);
  });

  it("is zero when credits exceed liability (refund situation — never negative)", () => {
    const { netTaxPayable } = computeTax({ ...BASE, advanceTaxPaid: 400_000 });
    expect(netTaxPayable).toBe(0);
  });
});

// ─── Tax refundable ───────────────────────────────────────────────────────────

describe("tax refundable", () => {
  it("is zero when credits are less than liability", () => {
    const { taxRefundable } = computeTax({ ...BASE, advanceTaxPaid: 50_000 });
    expect(taxRefundable).toBe(0);
  });

  it("equals excess credits when credits exceed liability", () => {
    const { taxRefundable } = computeTax({ ...BASE, advanceTaxPaid: 400_000 });
    expect(taxRefundable).toBeCloseTo(400_000 - 294_000, 2);
  });

  it("netTaxPayable and taxRefundable are never both > 0 simultaneously", () => {
    for (const advanceTaxPaid of [0, 100_000, 294_000, 400_000, 1_000_000]) {
      const r = computeTax({ ...BASE, advanceTaxPaid });
      expect(r.netTaxPayable > 0 && r.taxRefundable > 0).toBe(false);
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("all inputs zero produces all zero outputs", () => {
    const r = computeTax({
      accountingProfit: 0,
      addbackDepreciation: 0, addbackEntertainment: 0, addbackFines: 0, addbackOther: 0,
      capitalAllowances: 0, otherAllowableDeductions: 0,
      lossesUtilised: 0,
      taxRate: 30,
      taxCredits: 0, advanceTaxPaid: 0, whtCredits: 0,
    });
    expect(r.totalAddbacks).toBe(0);
    expect(r.totalDeductions).toBe(0);
    expect(r.taxableProfit).toBe(0);
    expect(r.grossTaxLiability).toBe(0);
    expect(r.totalCredits).toBe(0);
    expect(r.netTaxPayable).toBe(0);
    expect(r.taxRefundable).toBe(0);
  });

  it("zero tax rate produces zero liability even with positive taxable profit", () => {
    const { grossTaxLiability, netTaxPayable } = computeTax({ ...BASE, taxRate: 0 });
    expect(grossTaxLiability).toBe(0);
    expect(netTaxPayable).toBe(0);
  });
});

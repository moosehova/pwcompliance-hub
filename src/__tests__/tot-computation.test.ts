/**
 * Unit tests for the Turnover Tax computation engine (computeTurnoverTax).
 *
 * ⚠️  TAX RATES: The rate figures used below are ILLUSTRATIVE ONLY.
 * They do not represent current or historical Zambian tax law.
 * Before using this in production, verify rates against official ZRA
 * publications or qualified tax advice.
 *
 * As of this writing, Zambia's Turnover Tax rate is widely cited as 4% of
 * gross taxable turnover (Income Tax Act Cap 323), but rates and thresholds
 * change — always consult the current ZRA guidelines.
 */

import { describe, it, expect } from "vitest";
import { computeTurnoverTax } from "@/lib/tot-computation";

// ─── Base fixture ─────────────────────────────────────────────────────────────
// ILLUSTRATIVE — not official Zambian rates

const BASE = {
  grossTurnover: 500_000,
  exportSales: 0,
  dividendIncome: 0,
  interestIncome: 0,
  rentalIncome: 0,
  capitalGains: 0,
  otherExclusions: 0,
  taxRate: 4, // ILLUSTRATIVE — verify against current ZRA rate
  quarterlyPayments: 0,
  whtCredits: 0,
  otherCredits: 0,
};

// BASE expected values:
// totalExclusions = 0
// taxableTurnover = 500_000
// taxLiability = 500_000 * 0.04 = 20_000
// netTaxPayable = 20_000

// ─── Exclusions ──────────────────────────────────────────────────────────────

describe("exclusions", () => {
  it("sums all six exclusion categories", () => {
    const { totalExclusions } = computeTurnoverTax({
      ...BASE,
      exportSales: 10_000,
      dividendIncome: 5_000,
      interestIncome: 3_000,
      rentalIncome: 2_000,
      capitalGains: 1_000,
      otherExclusions: 500,
    });
    expect(totalExclusions).toBe(21_500);
  });

  it("zero exclusions when all are zero", () => {
    const { totalExclusions } = computeTurnoverTax(BASE);
    expect(totalExclusions).toBe(0);
  });

  it("reduces taxable turnover by total exclusions", () => {
    const { taxableTurnover } = computeTurnoverTax({
      ...BASE,
      exportSales: 100_000,
    });
    expect(taxableTurnover).toBe(400_000);
  });
});

// ─── Taxable turnover ─────────────────────────────────────────────────────────

describe("taxable turnover", () => {
  it("equals gross turnover when no exclusions", () => {
    const { taxableTurnover } = computeTurnoverTax(BASE);
    expect(taxableTurnover).toBe(500_000);
  });

  it("is never negative even if exclusions exceed gross turnover", () => {
    const { taxableTurnover } = computeTurnoverTax({
      ...BASE,
      exportSales: 600_000, // More than grossTurnover
    });
    expect(taxableTurnover).toBe(0);
  });
});

// ─── Tax liability ────────────────────────────────────────────────────────────

describe("tax liability", () => {
  it("is taxableTurnover × rate / 100 (ILLUSTRATIVE 4% rate)", () => {
    const { taxLiability } = computeTurnoverTax(BASE);
    expect(taxLiability).toBeCloseTo(20_000, 2);
  });

  it("is zero when taxable turnover is zero", () => {
    const { taxLiability } = computeTurnoverTax({
      ...BASE,
      exportSales: 500_000,
    });
    expect(taxLiability).toBe(0);
  });

  it("is zero when tax rate is zero", () => {
    const { taxLiability } = computeTurnoverTax({ ...BASE, taxRate: 0 });
    expect(taxLiability).toBe(0);
  });

  it("scales proportionally with rate (ILLUSTRATIVE)", () => {
    const r4 = computeTurnoverTax({ ...BASE, taxRate: 4 });
    const r8 = computeTurnoverTax({ ...BASE, taxRate: 8 });
    expect(r8.taxLiability).toBeCloseTo(r4.taxLiability * 2, 2);
  });
});

// ─── Credits ─────────────────────────────────────────────────────────────────

describe("credits", () => {
  it("sums all three credit types", () => {
    const { totalCredits } = computeTurnoverTax({
      ...BASE,
      quarterlyPayments: 5_000,
      whtCredits: 3_000,
      otherCredits: 1_000,
    });
    expect(totalCredits).toBe(9_000);
  });
});

// ─── Net tax payable ──────────────────────────────────────────────────────────

describe("net tax payable", () => {
  it("equals liability minus credits when credits < liability", () => {
    const { netTaxPayable } = computeTurnoverTax({
      ...BASE,
      quarterlyPayments: 5_000, // liability 20_000, so net = 15_000
    });
    expect(netTaxPayable).toBeCloseTo(15_000, 2);
  });

  it("is zero when credits fully cover the liability", () => {
    const { netTaxPayable } = computeTurnoverTax({
      ...BASE,
      quarterlyPayments: 20_000,
    });
    expect(netTaxPayable).toBe(0);
  });

  it("is zero (never negative) when credits exceed liability", () => {
    const { netTaxPayable } = computeTurnoverTax({
      ...BASE,
      quarterlyPayments: 30_000,
    });
    expect(netTaxPayable).toBe(0);
  });
});

// ─── Tax refundable ───────────────────────────────────────────────────────────

describe("tax refundable", () => {
  it("is zero when credits are less than liability", () => {
    const { taxRefundable } = computeTurnoverTax({ ...BASE, quarterlyPayments: 5_000 });
    expect(taxRefundable).toBe(0);
  });

  it("equals excess credits when credits exceed liability", () => {
    const { taxRefundable } = computeTurnoverTax({ ...BASE, quarterlyPayments: 25_000 });
    expect(taxRefundable).toBeCloseTo(5_000, 2); // 25_000 - 20_000
  });

  it("netTaxPayable and taxRefundable are never both > 0 simultaneously", () => {
    const cases = [0, 5_000, 20_000, 25_000, 50_000];
    for (const quarterlyPayments of cases) {
      const r = computeTurnoverTax({ ...BASE, quarterlyPayments });
      expect(r.netTaxPayable > 0 && r.taxRefundable > 0).toBe(false);
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("all inputs zero produces all zero outputs", () => {
    const r = computeTurnoverTax({
      grossTurnover: 0,
      exportSales: 0,
      dividendIncome: 0,
      interestIncome: 0,
      rentalIncome: 0,
      capitalGains: 0,
      otherExclusions: 0,
      taxRate: 4,
      quarterlyPayments: 0,
      whtCredits: 0,
      otherCredits: 0,
    });
    expect(r.totalExclusions).toBe(0);
    expect(r.taxableTurnover).toBe(0);
    expect(r.taxLiability).toBe(0);
    expect(r.totalCredits).toBe(0);
    expect(r.netTaxPayable).toBe(0);
    expect(r.taxRefundable).toBe(0);
  });

  it("large turnover computes correctly (ILLUSTRATIVE 4% rate)", () => {
    const { taxLiability } = computeTurnoverTax({
      ...BASE,
      grossTurnover: 10_000_000,
    });
    expect(taxLiability).toBeCloseTo(400_000, 2);
  });
});

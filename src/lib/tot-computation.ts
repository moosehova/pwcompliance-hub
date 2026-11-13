/**
 * Pure Turnover Tax computation engine.
 *
 * ⚠️  TAX RATES: The rates and thresholds referenced here are CONFIGURABLE.
 *    They must be verified against official ZRA publications or qualified tax
 *    advice before use in a production context.
 *    Do NOT hard-code rates in this file — always pass them in via `input.taxRate`.
 */

export interface TotInput {
  /** Total revenue/receipts for the period */
  grossTurnover: number;

  // ── Statutory exclusions ──────────────────────────────────────────────────
  /** Export sales excluded from turnover */
  exportSales: number;
  /** Dividend income excluded */
  dividendIncome: number;
  /** Interest income excluded */
  interestIncome: number;
  /** Rental income excluded */
  rentalIncome: number;
  /** Capital gains excluded */
  capitalGains: number;
  /** Any other permissible exclusions */
  otherExclusions: number;

  // ── Tax rate ──────────────────────────────────────────────────────────────
  /**
   * Rate in percentage points (e.g. 4 for 4%).
   * Must be sourced from a verified TaxRule record — do not hard-code.
   */
  taxRate: number;

  // ── Credits and advance payments ──────────────────────────────────────────
  quarterlyPayments: number;
  whtCredits: number;
  otherCredits: number;
}

export interface TotResult {
  totalExclusions: number;
  taxableTurnover: number;
  taxLiability: number;
  totalCredits: number;
  netTaxPayable: number;
  taxRefundable: number;
}

export function computeTurnoverTax(input: TotInput): TotResult {
  const totalExclusions =
    input.exportSales +
    input.dividendIncome +
    input.interestIncome +
    input.rentalIncome +
    input.capitalGains +
    input.otherExclusions;

  const taxableTurnover = Math.max(0, input.grossTurnover - totalExclusions);

  const taxLiability = (taxableTurnover * input.taxRate) / 100;

  const totalCredits =
    input.quarterlyPayments + input.whtCredits + input.otherCredits;

  const netTaxPayable = Math.max(0, taxLiability - totalCredits);
  const taxRefundable = Math.max(0, totalCredits - taxLiability);

  return {
    totalExclusions,
    taxableTurnover,
    taxLiability,
    totalCredits,
    netTaxPayable,
    taxRefundable,
  };
}

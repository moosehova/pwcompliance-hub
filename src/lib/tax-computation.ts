export interface TaxComputationInput {
  accountingProfit: number;
  addbackDepreciation: number;
  addbackEntertainment: number;
  addbackFines: number;
  addbackOther: number;
  capitalAllowances: number;
  otherAllowableDeductions: number;
  lossesUtilised: number;
  taxRate: number;
  taxCredits: number;
  advanceTaxPaid: number;
  whtCredits: number;
}

export interface TaxComputationResult {
  totalAddbacks: number;
  totalDeductions: number;
  taxableProfit: number;
  grossTaxLiability: number;
  totalCredits: number;
  netTaxPayable: number;
  taxRefundable: number;
}

export function computeTax(input: TaxComputationInput): TaxComputationResult {
  const totalAddbacks =
    input.addbackDepreciation +
    input.addbackEntertainment +
    input.addbackFines +
    input.addbackOther;

  const totalDeductions =
    input.capitalAllowances + input.otherAllowableDeductions;

  const taxableProfit =
    input.accountingProfit + totalAddbacks - totalDeductions - input.lossesUtilised;

  const grossTaxLiability =
    taxableProfit > 0 ? (taxableProfit * input.taxRate) / 100 : 0;

  const totalCredits =
    input.taxCredits + input.advanceTaxPaid + input.whtCredits;

  const netTaxPayable = Math.max(0, grossTaxLiability - totalCredits);
  const taxRefundable = Math.max(0, totalCredits - grossTaxLiability);

  return {
    totalAddbacks,
    totalDeductions,
    taxableProfit,
    grossTaxLiability,
    totalCredits,
    netTaxPayable,
    taxRefundable,
  };
}

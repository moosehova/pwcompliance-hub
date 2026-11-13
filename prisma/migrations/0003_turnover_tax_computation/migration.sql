-- Migration: 0003_turnover_tax_computation
-- Adds TurnoverTaxComputation table for Zambia Turnover Tax (TOT) workflow.
-- Separate from TaxReturnComputation (CIT) — TOT has different fields (gross
-- turnover, exclusions, eligibility) and a flat rate rather than a stepped computation.

CREATE TABLE "TurnoverTaxComputation" (
  "id"                   TEXT NOT NULL,
  "taxReturnId"          TEXT NOT NULL,

  -- Eligibility
  "eligibilityChecked"   BOOLEAN NOT NULL DEFAULT false,
  "annualTurnoverCheck"  BOOLEAN NOT NULL DEFAULT false,
  "notVatRegistered"     BOOLEAN NOT NULL DEFAULT false,
  "eligibilityNotes"     TEXT,

  -- Gross turnover
  "grossTurnover"        DECIMAL(65,30) NOT NULL DEFAULT 0,

  -- Statutory exclusions
  "exportSales"          DECIMAL(65,30) NOT NULL DEFAULT 0,
  "dividendIncome"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "interestIncome"       DECIMAL(65,30) NOT NULL DEFAULT 0,
  "rentalIncome"         DECIMAL(65,30) NOT NULL DEFAULT 0,
  "capitalGains"         DECIMAL(65,30) NOT NULL DEFAULT 0,
  "otherExclusions"      DECIMAL(65,30) NOT NULL DEFAULT 0,
  "exclusionNotes"       TEXT,
  "totalExclusions"      DECIMAL(65,30) NOT NULL DEFAULT 0,

  -- Computation
  "taxableTurnover"      DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxRate"              DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxLiability"         DECIMAL(65,30) NOT NULL DEFAULT 0,

  -- Credits
  "quarterlyPayments"    DECIMAL(65,30) NOT NULL DEFAULT 0,
  "whtCredits"           DECIMAL(65,30) NOT NULL DEFAULT 0,
  "otherCredits"         DECIMAL(65,30) NOT NULL DEFAULT 0,
  "totalCredits"         DECIMAL(65,30) NOT NULL DEFAULT 0,

  "netTaxPayable"        DECIMAL(65,30) NOT NULL DEFAULT 0,
  "taxRefundable"        DECIMAL(65,30) NOT NULL DEFAULT 0,

  -- Metadata
  "taxRuleSnapshot"      JSONB,
  "notes"                TEXT,
  "updatedAt"            TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TurnoverTaxComputation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TurnoverTaxComputation_taxReturnId_key" UNIQUE ("taxReturnId"),
  CONSTRAINT "TurnoverTaxComputation_taxReturnId_fkey"
    FOREIGN KEY ("taxReturnId") REFERENCES "TaxReturn"("id") ON DELETE CASCADE
);

CREATE INDEX "TurnoverTaxComputation_taxReturnId_idx" ON "TurnoverTaxComputation"("taxReturnId");

-- Vault v2: rename storagePath→blobUrl, add TaxDocumentCategory enum, add taxYear

-- ── Document table: rename storagePath to blobUrl ────────────────────────────
ALTER TABLE "Document" RENAME COLUMN "storagePath" TO "blobUrl";

-- ── TaxReturnDocument table ───────────────────────────────────────────────────

-- Add new columns
ALTER TABLE "TaxReturnDocument" ADD COLUMN "taxYear" INTEGER;
ALTER TABLE "TaxReturnDocument" ADD COLUMN "blobUrl" TEXT;

-- Preserve any existing storagePath values in blobUrl before dropping
UPDATE "TaxReturnDocument" SET "blobUrl" = "storagePath" WHERE "storagePath" IS NOT NULL;

-- Drop old storagePath
ALTER TABLE "TaxReturnDocument" DROP COLUMN "storagePath";

-- Create TaxDocumentCategory enum
CREATE TYPE "TaxDocumentCategory" AS ENUM (
  'BANK_STATEMENTS',
  'FINANCIAL_STATEMENTS',
  'TRIAL_BALANCES',
  'INVOICES_AND_RECEIPTS',
  'TAX_CERTIFICATES',
  'CAPITAL_ALLOWANCE_SCHEDULES',
  'PAYROLL_RECORDS',
  'ZRA_CORRESPONDENCE',
  'PACRA_DOCUMENTS',
  'NAPSA_DOCUMENTS',
  'NHIMA_DOCUMENTS',
  'OTHER_SUPPORTING'
);

-- Replace category String column with TaxDocumentCategory enum column
ALTER TABLE "TaxReturnDocument"
  ADD COLUMN "category_new" "TaxDocumentCategory" NOT NULL DEFAULT 'OTHER_SUPPORTING';

ALTER TABLE "TaxReturnDocument" DROP COLUMN "category";

ALTER TABLE "TaxReturnDocument" RENAME COLUMN "category_new" TO "category";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."BusinessStatus" AS ENUM ('ACTIVE', 'DORMANT', 'LIQUIDATED', 'DEREGISTERED');

-- CreateEnum
CREATE TYPE "public"."BusinessType" AS ENUM ('PRIVATE_LIMITED', 'PUBLIC_LIMITED', 'SOLE_TRADER', 'PARTNERSHIP', 'NGO', 'TRUST', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."CapitalAllowanceCategory" AS ENUM ('INDUSTRIAL_BUILDING', 'COMMERCIAL_BUILDING', 'PLANT_MACHINERY', 'MOTOR_VEHICLE', 'COMPUTER_EQUIPMENT', 'FURNITURE_FITTINGS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentCategory" AS ENUM ('PACRA', 'ZRA', 'NAPSA', 'NHIMA', 'PAYROLL', 'TAX', 'COMPANY_REGISTRATION', 'LICENCE', 'CERTIFICATE', 'RECEIPT', 'RETURN', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DocumentStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUPERSEDED', 'DELETED');

-- CreateEnum
CREATE TYPE "public"."EmployeeStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED', 'ON_LEAVE');

-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('OWNER', 'ADMINISTRATOR', 'ACCOUNTANT', 'HR', 'COMPLIANCE_OFFICER', 'VIEWER', 'TAX_PRACTITIONER', 'REVIEWER');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS', 'DEADLINE', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."ObligationStatus" AS ENUM ('UPCOMING', 'DUE_SOON', 'DUE', 'OVERDUE', 'SUBMITTED', 'PENDING_PAYMENT', 'PAID', 'COMPLETED', 'NOT_APPLICABLE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."OrgPlan" AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'BUSINESS', 'ACCOUNTING_FIRM');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."PayrollStatus" AS ENUM ('DRAFT', 'PROCESSING', 'PROCESSED', 'APPROVED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."ReminderStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."RequirementFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'ONCE', 'AD_HOC');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PENDING_REVIEW');

-- CreateEnum
CREATE TYPE "public"."TaxReturnReviewAction" AS ENUM ('SUBMIT_FOR_REVIEW', 'APPROVE', 'REQUEST_CHANGES', 'SUBMIT_TO_ZRA', 'COMPLETE');

-- CreateEnum
CREATE TYPE "public"."TaxReturnStatus" AS ENUM ('DRAFT', 'PREPARED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SUBMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."TaxReturnType" AS ENUM ('COMPANY_INCOME_TAX', 'TURNOVER_TAX', 'VAT', 'PAYE', 'WITHHOLDING_TAX');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "businessId" TEXT,
    "obligationId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT,
    "taxReturnId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Authority" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "description" TEXT,
    "website" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Authority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthorityRule" (
    "id" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ruleType" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthorityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Business" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "businessType" "public"."BusinessType" NOT NULL,
    "industry" TEXT,
    "pacraNumber" TEXT,
    "tpin" TEXT,
    "napsaEmployerNo" TEXT,
    "nhimaEmployerNo" TEXT,
    "vatNumber" TEXT,
    "physicalAddress" TEXT,
    "postalAddress" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "country" TEXT NOT NULL DEFAULT 'ZM',
    "status" "public"."BusinessStatus" NOT NULL DEFAULT 'ACTIVE',
    "incorporatedDate" TIMESTAMP(3),
    "financialYearEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BusinessRequirement" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "customDueDays" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceObligation" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."ObligationStatus" NOT NULL DEFAULT 'UPCOMING',
    "amountDue" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ComplianceObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "public"."RequirementFrequency" NOT NULL,
    "applicableTo" TEXT[],
    "defaultDueDayOfMonth" INTEGER,
    "defaultDueDayOfYear" TEXT,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContributionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contributionType" TEXT NOT NULL,
    "description" TEXT,
    "employeeRate" DECIMAL(65,30),
    "employerRate" DECIMAL(65,30),
    "ceiling" DECIMAL(65,30),
    "floor" DECIMAL(65,30),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContributionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Director" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nrc" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "position" TEXT,
    "appointedAt" TIMESTAMP(3),
    "resignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorityId" TEXT,
    "obligationId" TEXT,
    "submissionId" TEXT,
    "paymentId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "mimeType" TEXT,
    "size" INTEGER,
    "url" TEXT,
    "expiryDate" TIMESTAMP(3),
    "periodLabel" TEXT,
    "status" "public"."DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "storagePath" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "versionOf" TEXT,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Employee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "employeeNo" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nrc" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "jobTitle" TEXT,
    "department" TEXT,
    "employedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "status" "public"."EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "basicSalary" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "napsaNumber" TEXT,
    "nhimaNumber" TEXT,
    "tpin" TEXT,
    "bankName" TEXT,
    "bankAccountNo" TEXT,
    "bankSortCode" TEXT,
    "emergencyContact" TEXT,
    "emergencyPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FixedAsset" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assetCategory" "public"."CapitalAllowanceCategory" NOT NULL,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "businessUsePercent" DECIMAL(65,30) NOT NULL DEFAULT 100,
    "qualifyingCost" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "disposalDate" TIMESTAMP(3),
    "disposalProceeds" DECIMAL(65,30),
    "taxWdvBrought" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "allowanceRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "calculatedAllowance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxWdvCarried" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "accountingDepreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL DEFAULT 'INFO',
    "readAt" TIMESTAMP(3),
    "link" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logo" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "plan" "public"."OrgPlan" NOT NULL DEFAULT 'FREE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."MemberRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationSetting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "obligationId" TEXT,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ZMW',
    "paidAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "referenceNo" TEXT,
    "bankName" TEXT,
    "branchName" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payroll" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "periodLabel" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "public"."PayrollStatus" NOT NULL DEFAULT 'DRAFT',
    "totalGross" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNapsa" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNhima" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalPaye" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNet" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payroll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PayrollItem" (
    "id" TEXT NOT NULL,
    "payrollId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "basicSalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "allowances" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossSalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "napsaEmployee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "napsaEmployer" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nhimaEmployee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "nhimaEmployer" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "paye" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reminder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "obligationId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "public"."ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Shareholder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'individual',
    "nrc" TEXT,
    "sharesHeld" INTEGER,
    "sharePercentage" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shareholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Submission" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "obligationId" TEXT,
    "referenceNo" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submittedBy" TEXT,
    "method" TEXT,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "channel" TEXT,
    "confirmationNo" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxAdjustment" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxLoss" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxReturnId" TEXT,
    "taxYear" INTEGER NOT NULL,
    "originalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "utilisedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "expiresYear" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxLoss_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxReturn" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "taxType" "public"."TaxReturnType" NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "financialYearStart" TIMESTAMP(3),
    "financialYearEnd" TIMESTAMP(3),
    "referenceNo" TEXT,
    "status" "public"."TaxReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "preparerId" TEXT,
    "reviewerId" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "submissionRef" TEXT,
    "filedById" TEXT,
    "filingReceipt" TEXT,
    "paymentRef" TEXT,
    "paymentDate" TIMESTAMP(3),
    "taxRuleId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isAmended" BOOLEAN NOT NULL DEFAULT false,
    "amendedFromId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TaxReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxReturnBalanceSheet" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "ppe" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "intangibleAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "longTermInvestments" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherNonCurrentAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNonCurrentAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "inventory" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tradeReceivables" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherReceivables" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "cashAndBank" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCurrentAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCurrentAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAssets" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tradePayables" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxLiabilitiesCurrent" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentBorrowings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherCurrentLiabilities" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCurrentLiabilities" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "longTermBorrowings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "deferredTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherNonCurrentLiabilities" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalNonCurrentLiabilities" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalLiabilities" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "shareCapital" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sharePremium" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "retainedEarnings" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherEquity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalEquity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalLiabilitiesAndEquity" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturnBalanceSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxReturnComputation" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "accountingProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "addbackDepreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "addbackEntertainment" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "addbackFines" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "addbackOther" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalAddbacks" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "capitalAllowances" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherAllowableDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lossesUtilised" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxableProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossTaxLiability" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxCredits" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "advanceTaxPaid" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "whtCredits" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalCredits" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "netTaxPayable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRefundable" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxRuleSnapshot" JSONB,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturnComputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxReturnDocument" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "mimeType" TEXT,
    "size" INTEGER,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "storagePath" TEXT,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "versionOf" TEXT,

    CONSTRAINT "TaxReturnDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxReturnIncomeStatement" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "turnover" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherOperatingIncome" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "costOfSales" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "grossProfit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "adminExpenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "sellingExpenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "depreciation" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "financeCharges" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "otherExpenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitBeforeTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxExpense" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "profitAfterTax" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReturnIncomeStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxReturnReview" (
    "id" TEXT NOT NULL,
    "taxReturnId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" "public"."TaxReturnReviewAction" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxReturnReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TaxRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxType" TEXT NOT NULL,
    "description" TEXT,
    "brackets" JSONB,
    "flatRate" DECIMAL(65,30),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedById" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider" ASC, "providerAccountId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Authority_code_key" ON "public"."Authority"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRequirement_businessId_requirementId_key" ON "public"."BusinessRequirement"("businessId" ASC, "requirementId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ComplianceRequirement_authorityId_code_key" ON "public"."ComplianceRequirement"("authorityId" ASC, "code" ASC);

-- CreateIndex
CREATE INDEX "Document_organizationId_businessId_idx" ON "public"."Document"("organizationId" ASC, "businessId" ASC);

-- CreateIndex
CREATE INDEX "Document_organizationId_deletedAt_idx" ON "public"."Document"("organizationId" ASC, "deletedAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_businessId_employeeNo_key" ON "public"."Employee"("businessId" ASC, "employeeNo" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "public"."OrganizationMember"("organizationId" ASC, "userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSetting_organizationId_key_key" ON "public"."OrganizationSetting"("organizationId" ASC, "key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "PayrollItem_payrollId_employeeId_key" ON "public"."PayrollItem"("payrollId" ASC, "employeeId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "TaxReturn_businessId_idx" ON "public"."TaxReturn"("businessId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturn_businessId_taxType_taxYear_version_key" ON "public"."TaxReturn"("businessId" ASC, "taxType" ASC, "taxYear" ASC, "version" ASC);

-- CreateIndex
CREATE INDEX "TaxReturn_organizationId_idx" ON "public"."TaxReturn"("organizationId" ASC);

-- CreateIndex
CREATE INDEX "TaxReturn_status_idx" ON "public"."TaxReturn"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturnBalanceSheet_taxReturnId_key" ON "public"."TaxReturnBalanceSheet"("taxReturnId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturnComputation_taxReturnId_key" ON "public"."TaxReturnComputation"("taxReturnId" ASC);

-- CreateIndex
CREATE INDEX "TaxReturnDocument_organizationId_deletedAt_idx" ON "public"."TaxReturnDocument"("organizationId" ASC, "deletedAt" ASC);

-- CreateIndex
CREATE INDEX "TaxReturnDocument_organizationId_taxReturnId_idx" ON "public"."TaxReturnDocument"("organizationId" ASC, "taxReturnId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "TaxReturnIncomeStatement_taxReturnId_key" ON "public"."TaxReturnIncomeStatement"("taxReturnId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier" ASC, "token" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token" ASC);

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "public"."ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuthorityRule" ADD CONSTRAINT "AuthorityRule_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "public"."Authority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Business" ADD CONSTRAINT "Business_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessRequirement" ADD CONSTRAINT "BusinessRequirement_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BusinessRequirement" ADD CONSTRAINT "BusinessRequirement_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "public"."ComplianceRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "public"."Authority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceObligation" ADD CONSTRAINT "ComplianceObligation_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "public"."ComplianceRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "public"."Authority"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Director" ADD CONSTRAINT "Director_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "public"."Authority"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "public"."ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "public"."Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_versionOf_fkey" FOREIGN KEY ("versionOf") REFERENCES "public"."Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Employee" ADD CONSTRAINT "Employee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FixedAsset" ADD CONSTRAINT "FixedAsset_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FixedAsset" ADD CONSTRAINT "FixedAsset_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationSetting" ADD CONSTRAINT "OrganizationSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "public"."Authority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "public"."ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payroll" ADD CONSTRAINT "Payroll_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollItem" ADD CONSTRAINT "PayrollItem_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "public"."Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PayrollItem" ADD CONSTRAINT "PayrollItem_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "public"."Payroll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "public"."ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Shareholder" ADD CONSTRAINT "Shareholder_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "public"."Authority"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Submission" ADD CONSTRAINT "Submission_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "public"."ComplianceObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxAdjustment" ADD CONSTRAINT "TaxAdjustment_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxLoss" ADD CONSTRAINT "TaxLoss_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxLoss" ADD CONSTRAINT "TaxLoss_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_amendedFromId_fkey" FOREIGN KEY ("amendedFromId") REFERENCES "public"."TaxReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_filedById_fkey" FOREIGN KEY ("filedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_preparerId_fkey" FOREIGN KEY ("preparerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturn" ADD CONSTRAINT "TaxReturn_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "public"."TaxRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnBalanceSheet" ADD CONSTRAINT "TaxReturnBalanceSheet_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnComputation" ADD CONSTRAINT "TaxReturnComputation_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnDocument" ADD CONSTRAINT "TaxReturnDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "public"."Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnDocument" ADD CONSTRAINT "TaxReturnDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnDocument" ADD CONSTRAINT "TaxReturnDocument_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnDocument" ADD CONSTRAINT "TaxReturnDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnDocument" ADD CONSTRAINT "TaxReturnDocument_versionOf_fkey" FOREIGN KEY ("versionOf") REFERENCES "public"."TaxReturnDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnIncomeStatement" ADD CONSTRAINT "TaxReturnIncomeStatement_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnReview" ADD CONSTRAINT "TaxReturnReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TaxReturnReview" ADD CONSTRAINT "TaxReturnReview_taxReturnId_fkey" FOREIGN KEY ("taxReturnId") REFERENCES "public"."TaxReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

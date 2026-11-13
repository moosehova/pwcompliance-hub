import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addMonths, startOfMonth, endOfMonth, addDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding ComplianceHub Zambia...");

  // ─── USER & ORG ──────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "musole@mhventures.co.zm" },
    update: {},
    create: {
      name: "Musole",
      email: "musole@mhventures.co.zm",
      passwordHash,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "mh-ventures-group" },
    update: {},
    create: { name: "MH Ventures Group", slug: "mh-ventures-group" },
  });

  await prisma.organizationMember.upsert({
    where: { organizationId_userId: { organizationId: org.id, userId: user.id } },
    update: {},
    create: { organizationId: org.id, userId: user.id, role: "OWNER" },
  });

  // ─── AUTHORITIES ─────────────────────────────────────────────────────────────
  const pacra = await prisma.authority.upsert({
    where: { code: "PACRA" },
    update: {},
    create: {
      code: "PACRA",
      name: "PACRA",
      fullName: "Patents and Companies Registration Agency",
      description: "Responsible for company and business registration in Zambia.",
      website: "https://www.pacra.org.zm",
      sortOrder: 1,
    },
  });

  const zra = await prisma.authority.upsert({
    where: { code: "ZRA" },
    update: {},
    create: {
      code: "ZRA",
      name: "ZRA",
      fullName: "Zambia Revenue Authority",
      description: "Responsible for tax collection and administration in Zambia.",
      website: "https://www.zra.org.zm",
      sortOrder: 2,
    },
  });

  const napsa = await prisma.authority.upsert({
    where: { code: "NAPSA" },
    update: {},
    create: {
      code: "NAPSA",
      name: "NAPSA",
      fullName: "National Pension Scheme Authority",
      description: "Manages the national pension scheme for employees in Zambia.",
      website: "https://www.napsa.co.zm",
      sortOrder: 3,
    },
  });

  const nhima = await prisma.authority.upsert({
    where: { code: "NHIMA" },
    update: {},
    create: {
      code: "NHIMA",
      name: "NHIMA",
      fullName: "National Health Insurance Management Authority",
      description: "Manages the national health insurance scheme in Zambia.",
      website: "https://www.nhima.co.zm",
      sortOrder: 4,
    },
  });

  // ─── COMPLIANCE REQUIREMENTS ─────────────────────────────────────────────────
  const pacraAnnualReturn = await prisma.complianceRequirement.upsert({
    where: { authorityId_code: { authorityId: pacra.id, code: "PACRA_ANNUAL_RETURN" } },
    update: {},
    create: {
      authorityId: pacra.id,
      code: "PACRA_ANNUAL_RETURN",
      name: "Annual Return",
      description: "Annual return to be filed with PACRA confirming company details.",
      frequency: "ANNUAL",
      applicableTo: ["PRIVATE_LIMITED", "PUBLIC_LIMITED"],
      defaultDueDayOfMonth: 31,
      gracePeriodDays: 30,
      category: "Company Registration",
    },
  });

  const vatReturn = await prisma.complianceRequirement.upsert({
    where: { authorityId_code: { authorityId: zra.id, code: "ZRA_VAT_RETURN" } },
    update: {},
    create: {
      authorityId: zra.id,
      code: "ZRA_VAT_RETURN",
      name: "VAT Return",
      description: "Monthly Value Added Tax return to be filed with ZRA.",
      frequency: "MONTHLY",
      applicableTo: ["PRIVATE_LIMITED", "PUBLIC_LIMITED", "SOLE_TRADER"],
      defaultDueDayOfMonth: 18,
      gracePeriodDays: 0,
      category: "Tax",
    },
  });

  const payeReturn = await prisma.complianceRequirement.upsert({
    where: { authorityId_code: { authorityId: zra.id, code: "ZRA_PAYE_RETURN" } },
    update: {},
    create: {
      authorityId: zra.id,
      code: "ZRA_PAYE_RETURN",
      name: "PAYE Return",
      description: "Monthly Pay As You Earn tax return for employee income tax.",
      frequency: "MONTHLY",
      applicableTo: ["PRIVATE_LIMITED", "PUBLIC_LIMITED", "SOLE_TRADER", "PARTNERSHIP"],
      defaultDueDayOfMonth: 10,
      gracePeriodDays: 0,
      category: "Tax",
    },
  });

  const napsaMonthly = await prisma.complianceRequirement.upsert({
    where: { authorityId_code: { authorityId: napsa.id, code: "NAPSA_MONTHLY_CONTRIBUTION" } },
    update: {},
    create: {
      authorityId: napsa.id,
      code: "NAPSA_MONTHLY_CONTRIBUTION",
      name: "Monthly Contribution",
      description: "Monthly NAPSA contribution returns for all employees.",
      frequency: "MONTHLY",
      applicableTo: ["PRIVATE_LIMITED", "PUBLIC_LIMITED", "SOLE_TRADER", "PARTNERSHIP"],
      defaultDueDayOfMonth: 10,
      gracePeriodDays: 0,
      category: "Pension",
    },
  });

  const nhimaMonthly = await prisma.complianceRequirement.upsert({
    where: { authorityId_code: { authorityId: nhima.id, code: "NHIMA_MONTHLY_CONTRIBUTION" } },
    update: {},
    create: {
      authorityId: nhima.id,
      code: "NHIMA_MONTHLY_CONTRIBUTION",
      name: "Monthly Contribution",
      description: "Monthly NHIMA health insurance contribution for all employees.",
      frequency: "MONTHLY",
      applicableTo: ["PRIVATE_LIMITED", "PUBLIC_LIMITED", "SOLE_TRADER", "PARTNERSHIP"],
      defaultDueDayOfMonth: 10,
      gracePeriodDays: 0,
      category: "Health Insurance",
    },
  });

  // ─── STATUTORY RULES ─────────────────────────────────────────────────────────
  await prisma.contributionRule.upsert({
    where: { id: "napsa-rule-2024" },
    update: {},
    create: {
      id: "napsa-rule-2024",
      name: "NAPSA Contribution Rate 2024",
      contributionType: "NAPSA",
      description: "5% employee, 5% employer on basic salary. Maximum ceiling applies.",
      employeeRate: 0.05,
      employerRate: 0.05,
      ceiling: 1221.80,
      effectiveFrom: new Date("2024-01-01"),
      source: "NAPSA Act (Amendment) 2023",
      notes: "Ceiling amount should be verified with NAPSA. Rate as of January 2024.",
      verifiedAt: new Date("2024-01-01"),
    },
  });

  await prisma.contributionRule.upsert({
    where: { id: "nhima-rule-2024" },
    update: {},
    create: {
      id: "nhima-rule-2024",
      name: "NHIMA Contribution Rate 2024",
      contributionType: "NHIMA",
      description: "1% employee, 1% employer on basic salary.",
      employeeRate: 0.01,
      employerRate: 0.01,
      effectiveFrom: new Date("2024-01-01"),
      source: "NHIMA Act",
      notes: "Rate should be verified with NHIMA before filing.",
      verifiedAt: new Date("2024-01-01"),
    },
  });

  await prisma.taxRule.upsert({
    where: { id: "paye-rule-2024" },
    update: {},
    create: {
      id: "paye-rule-2024",
      name: "PAYE Tax Brackets 2024",
      taxType: "PAYE",
      description: "Zambia PAYE tax brackets for 2024",
      brackets: [
        { from: 0, to: 5100, rate: 0, description: "Tax-free threshold" },
        { from: 5100, to: 7100, rate: 0.25, description: "25% bracket" },
        { from: 7100, to: 9200, rate: 0.30, description: "30% bracket" },
        { from: 9200, to: null, rate: 0.375, description: "37.5% bracket" },
      ],
      effectiveFrom: new Date("2024-01-01"),
      source: "ZRA / Zambia Budget 2024",
      notes: "Verify current brackets with ZRA before payroll processing.",
      verifiedAt: new Date("2024-01-01"),
    },
  });

  // ─── TURNOVER TAX RULE ───────────────────────────────────────────────────────
  // ⚠️  IMPORTANT: This rate is a DRAFT placeholder.
  //    Verify the current rate against ZRA publications or the Income Tax Act
  //    Cap 323 (Zambia) before using in a production context.
  //    The rate widely cited is 4% of gross taxable turnover, but this MUST be
  //    independently confirmed. Set isDraft=false only after verification.
  await prisma.taxRule.upsert({
    where: { id: "tot-rule-2024" },
    update: {},
    create: {
      id: "tot-rule-2024",
      name: "Turnover Tax Rate 2024 (DRAFT — verify with ZRA)",
      taxType: "TURNOVER_TAX",
      description:
        "Zambia Turnover Tax (TOT) flat rate. Applicable to businesses whose annual gross " +
        "turnover does not exceed the statutory threshold and are not VAT-registered. " +
        "Rate and threshold MUST be verified against current ZRA guidelines.",
      flatRate: 4, // ⚠️ ILLUSTRATIVE — verify with ZRA
      effectiveFrom: new Date("2024-01-01"),
      source: "Income Tax Act Cap 323 of Zambia (verify edition year)",
      notes:
        "This record is a DRAFT. The 4% rate is widely cited for TOT in Zambia, " +
        "but official verification is required before filing. Update isDraft to false " +
        "and set verifiedAt after confirming with ZRA or a qualified tax practitioner.",
      isDraft: true,
      active: true,
    },
  });

  // ─── TEST BUSINESS: PEBBLES COLLEGE ──────────────────────────────────────────
  const business = await prisma.business.upsert({
    where: { id: "pebbles-college-001" },
    update: {},
    create: {
      id: "pebbles-college-001",
      organizationId: org.id,
      legalName: "Pebbles College International School Limited",
      tradingName: "Pebbles College International School",
      businessType: "PRIVATE_LIMITED",
      industry: "Education",
      pacraNumber: "120240001234",
      tpin: "1001234567",
      napsaEmployerNo: "8001234",
      nhimaEmployerNo: "NH001234",
      physicalAddress: "Plot 1234, Great East Road, Lusaka, Zambia",
      postalAddress: "P.O. Box 30001, Lusaka",
      phone: "+260 211 123 456",
      email: "info@pebblescollege.co.zm",
      status: "ACTIVE",
      incorporatedDate: new Date("2015-03-15"),
      financialYearEnd: 12,
    },
  });

  // Business requirements
  for (const req of [vatReturn, payeReturn, napsaMonthly, nhimaMonthly]) {
    await prisma.businessRequirement.upsert({
      where: { businessId_requirementId: { businessId: business.id, requirementId: req.id } },
      update: {},
      create: { businessId: business.id, requirementId: req.id, enabled: true },
    });
  }

  await prisma.businessRequirement.upsert({
    where: { businessId_requirementId: { businessId: business.id, requirementId: pacraAnnualReturn.id } },
    update: {},
    create: { businessId: business.id, requirementId: pacraAnnualReturn.id, enabled: true },
  });

  // ─── EMPLOYEES ───────────────────────────────────────────────────────────────
  const employeeData = [
    { firstName: "Grace", lastName: "Mwale", jobTitle: "Head Teacher", department: "Academic", basicSalary: 12000, napsaNumber: "N001234", nhimaNumber: "H001234" },
    { firstName: "Joseph", lastName: "Banda", jobTitle: "Deputy Head", department: "Academic", basicSalary: 10000, napsaNumber: "N001235", nhimaNumber: "H001235" },
    { firstName: "Mary", lastName: "Tembo", jobTitle: "Senior Teacher", department: "Academic", basicSalary: 8500, napsaNumber: "N001236", nhimaNumber: "H001236" },
    { firstName: "Peter", lastName: "Chanda", jobTitle: "Teacher", department: "Academic", basicSalary: 7000, napsaNumber: "N001237", nhimaNumber: "H001237" },
    { firstName: "Agnes", lastName: "Phiri", jobTitle: "Teacher", department: "Academic", basicSalary: 7000, napsaNumber: "N001238", nhimaNumber: "H001238" },
    { firstName: "David", lastName: "Mutale", jobTitle: "Accounts Officer", department: "Finance", basicSalary: 9000, napsaNumber: "N001239", nhimaNumber: "H001239" },
    { firstName: "Ruth", lastName: "Kangwa", jobTitle: "HR Officer", department: "HR", basicSalary: 8000, napsaNumber: "N001240", nhimaNumber: "H001240" },
    { firstName: "Samuel", lastName: "Lungu", jobTitle: "Security Guard", department: "Security", basicSalary: 3500, napsaNumber: "N001241", nhimaNumber: "H001241" },
    { firstName: "Faith", lastName: "Zulu", jobTitle: "Cleaner", department: "Facilities", basicSalary: 3000, napsaNumber: "N001242", nhimaNumber: "H001242" },
    { firstName: "Charles", lastName: "Mumba", jobTitle: "Driver", department: "Transport", basicSalary: 4500, napsaNumber: "N001243", nhimaNumber: "H001243" },
  ];

  for (let i = 0; i < employeeData.length; i++) {
    const emp = employeeData[i];
    await prisma.employee.upsert({
      where: { businessId_employeeNo: { businessId: business.id, employeeNo: `EMP${String(i + 1).padStart(3, "0")}` } },
      update: {},
      create: {
        businessId: business.id,
        employeeNo: `EMP${String(i + 1).padStart(3, "0")}`,
        firstName: emp.firstName,
        lastName: emp.lastName,
        jobTitle: emp.jobTitle,
        department: emp.department,
        basicSalary: emp.basicSalary,
        napsaNumber: emp.napsaNumber,
        nhimaNumber: emp.nhimaNumber,
        employedAt: new Date("2020-01-01"),
        status: "ACTIVE",
      },
    });
  }

  // ─── GENERATE OBLIGATIONS (last 6 months + next 3 months) ───────────────────
  const now = new Date();
  const obligations = [];

  // PACRA Annual Return
  const pacraObligation = {
    businessId: business.id,
    authorityId: pacra.id,
    requirementId: pacraAnnualReturn.id,
    title: "PACRA Annual Return 2024",
    periodLabel: "Year 2024",
    periodStart: new Date("2024-01-01"),
    periodEnd: new Date("2024-12-31"),
    dueDate: new Date("2025-03-31"),
    status: "COMPLETED" as const,
    amountDue: 500,
  };
  obligations.push(pacraObligation);

  // Monthly obligations for last 6 months + next 3 months
  for (let m = -5; m <= 2; m++) {
    const periodDate = addMonths(startOfMonth(now), m);
    const periodStart = startOfMonth(periodDate);
    const periodEnd = endOfMonth(periodDate);
    const monthLabel = periodDate.toLocaleDateString("en-ZM", { month: "long", year: "numeric" });

    // VAT
    const vatDue = addDays(periodEnd, 18);
    const vatStatus = m < -1 ? "COMPLETED" : m === -1 ? "SUBMITTED" : m === 0 ? "DUE_SOON" : "UPCOMING";
    obligations.push({
      businessId: business.id,
      authorityId: zra.id,
      requirementId: vatReturn.id,
      title: `VAT Return — ${monthLabel}`,
      periodLabel: monthLabel,
      periodStart,
      periodEnd,
      dueDate: vatDue,
      status: vatStatus as "COMPLETED" | "UPCOMING" | "DUE_SOON" | "OVERDUE" | "SUBMITTED",
      amountDue: m < 0 ? 8500 : null,
    });

    // PAYE
    const payeDue = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 10);
    const payeStatus = m < -2 ? "COMPLETED" : m === -2 ? "PAID" : m === -1 ? "OVERDUE" : m === 0 ? "DUE_SOON" : "UPCOMING";
    obligations.push({
      businessId: business.id,
      authorityId: zra.id,
      requirementId: payeReturn.id,
      title: `PAYE Return — ${monthLabel}`,
      periodLabel: monthLabel,
      periodStart,
      periodEnd,
      dueDate: payeDue,
      status: payeStatus as "COMPLETED" | "PAID" | "OVERDUE" | "DUE_SOON" | "UPCOMING",
      amountDue: m < 0 ? 12000 : null,
    });

    // NAPSA
    const napsaDue = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 10);
    const napsaStatus = m < -1 ? "COMPLETED" : m === -1 ? "PAID" : m === 0 ? "DUE_SOON" : "UPCOMING";
    obligations.push({
      businessId: business.id,
      authorityId: napsa.id,
      requirementId: napsaMonthly.id,
      title: `NAPSA Contribution — ${monthLabel}`,
      periodLabel: monthLabel,
      periodStart,
      periodEnd,
      dueDate: napsaDue,
      status: napsaStatus as "COMPLETED" | "PAID" | "DUE_SOON" | "UPCOMING",
      amountDue: m < 0 ? 6100 : null,
    });

    // NHIMA
    const nhimaDue = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 10);
    const nhimaStatus = m < -2 ? "COMPLETED" : m === -2 ? "PAID" : m === -1 ? "PENDING_PAYMENT" : m === 0 ? "DUE_SOON" : "UPCOMING";
    obligations.push({
      businessId: business.id,
      authorityId: nhima.id,
      requirementId: nhimaMonthly.id,
      title: `NHIMA Contribution — ${monthLabel}`,
      periodLabel: monthLabel,
      periodStart,
      periodEnd,
      dueDate: nhimaDue,
      status: nhimaStatus as "COMPLETED" | "PAID" | "PENDING_PAYMENT" | "DUE_SOON" | "UPCOMING",
      amountDue: m < 0 ? 1220 : null,
    });
  }

  for (const obl of obligations) {
    await prisma.complianceObligation.create({ data: obl }).catch(() => {});
  }

  // ─── PAYMENTS ────────────────────────────────────────────────────────────────
  const completedObligations = await prisma.complianceObligation.findMany({
    where: { businessId: business.id, status: { in: ["COMPLETED", "PAID"] } },
    take: 6,
  });

  for (const obl of completedObligations) {
    await prisma.payment.create({
      data: {
        businessId: business.id,
        authorityId: obl.authorityId,
        obligationId: obl.id,
        description: `Payment for ${obl.title}`,
        amount: obl.amountDue ?? 5000,
        paidAt: addDays(obl.dueDate, -2),
        paymentMethod: "Bank Transfer",
        referenceNo: `REF${Date.now().toString().slice(-8)}`,
        status: "PAID",
      },
    }).catch(() => {});
  }

  // ─── DIRECTORS ───────────────────────────────────────────────────────────────
  await prisma.director.create({
    data: {
      businessId: business.id,
      name: "Musole Hamatowa",
      position: "Managing Director",
      nationality: "Zambian",
      appointedAt: new Date("2015-03-15"),
    },
  }).catch(() => {});

  console.log("✅ Seed complete!");
  console.log("📧 Login: musole@mhventures.co.zm");
  console.log("🔑 Password: password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

async function getContext() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) throw new Error("No organization");
  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  return { userId: session.user.id, businessIds: businesses.map((b) => b.id) };
}

export async function getEmployees(params?: { businessId?: string; status?: string }) {
  const { businessIds } = await getContext();
  return prisma.employee.findMany({
    where: {
      businessId: params?.businessId ?? { in: businessIds },
      deletedAt: null,
      ...(params?.status && { status: params.status as never }),
    },
    include: {
      business: { select: { legalName: true, tradingName: true } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getEmployeeById(id: string) {
  const { businessIds } = await getContext();
  return prisma.employee.findFirst({
    where: { id, businessId: { in: businessIds }, deletedAt: null },
    include: {
      business: { select: { legalName: true, tradingName: true } },
      payrollItems: { include: { payroll: true }, orderBy: { createdAt: "desc" }, take: 6 },
    },
  });
}

const employeeSchema = z.object({
  businessId: z.string(),
  employeeNo: z.string().optional(),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  nrc: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  employedAt: z.string().optional(),
  basicSalary: z.coerce.number().optional(),
  napsaNumber: z.string().optional(),
  nhimaNumber: z.string().optional(),
  tpin: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

export async function createEmployee(formData: unknown) {
  const { businessIds, userId } = await getContext();
  const data = employeeSchema.parse(formData);
  if (!businessIds.includes(data.businessId)) throw new Error("Business not found");

  const employee = await prisma.employee.create({
    data: {
      ...data,
      email: data.email || null,
      dob: data.dob ? new Date(data.dob) : null,
      employedAt: data.employedAt ? new Date(data.employedAt) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: data.businessId,
      action: "CREATE",
      entity: "Employee",
      entityId: employee.id,
      newValue: { name: `${employee.firstName} ${employee.lastName}` },
      description: `Created employee: ${employee.firstName} ${employee.lastName}`,
    },
  });

  revalidatePath("/employees");
  return { success: true, id: employee.id };
}

export async function updateEmployee(id: string, formData: unknown) {
  const { businessIds, userId } = await getContext();
  const data = employeeSchema.partial().omit({ businessId: true }).parse(formData);

  const existing = await prisma.employee.findFirst({ where: { id, businessId: { in: businessIds } } });
  if (!existing) throw new Error("Employee not found");

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...data,
      email: data.email || null,
      dob: data.dob ? new Date(data.dob) : undefined,
      employedAt: data.employedAt ? new Date(data.employedAt) : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId,
      businessId: existing.businessId,
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      description: `Updated employee: ${employee.firstName} ${employee.lastName}`,
    },
  });

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  return { success: true };
}

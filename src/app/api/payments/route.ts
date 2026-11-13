import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const schema = z.object({
  businessId: z.string(),
  authorityId: z.string(),
  obligationId: z.string().optional().nullable(),
  description: z.string(),
  amount: z.coerce.number().positive(),
  currency: z.string().default("ZMW"),
  paidAt: z.string(),
  paymentMethod: z.string().optional(),
  referenceNo: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json({ error: "No organization" }, { status: 403 });

    const businesses = await prisma.business.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true },
    });
    const businessIds = businesses.map((b) => b.id);

    const body = await req.json();
    const data = schema.parse(body);

    if (!businessIds.includes(data.businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    const payment = await prisma.payment.create({
      data: {
        ...data,
        paidAt: new Date(data.paidAt),
        status: "PAID",
      },
    });

    if (data.obligationId) {
      await prisma.complianceObligation.update({
        where: { id: data.obligationId },
        data: { status: "PAID" },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        businessId: data.businessId,
        action: "RECORD_PAYMENT",
        entity: "Payment",
        entityId: payment.id,
        newValue: { amount: data.amount, referenceNo: data.referenceNo },
        description: `Recorded payment: ${data.description}`,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

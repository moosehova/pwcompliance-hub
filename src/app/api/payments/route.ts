import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrgContext } from "@/lib/session";

const schema = z.object({
  businessId: z.string().min(1),
  authorityId: z.string().min(1),
  obligationId: z.string().optional().nullable(),
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  currency: z.string().default("ZMW"),
  paidAt: z.string().min(1),
  paymentMethod: z.string().optional(),
  referenceNo: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();

    const body = await req.json();
    const data = schema.parse(body);

    // Validate business belongs to this org
    if (!ctx.businessIds.includes(data.businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    // Validate obligation belongs to this business (prevents cross-org obligation manipulation)
    if (data.obligationId) {
      const obligation = await prisma.complianceObligation.findFirst({
        where: { id: data.obligationId, businessId: data.businessId },
      });
      if (!obligation) {
        return NextResponse.json({ error: "Obligation not found" }, { status: 403 });
      }
    }

    // Validate authority exists
    const authority = await prisma.authority.findFirst({ where: { id: data.authorityId } });
    if (!authority) {
      return NextResponse.json({ error: "Authority not found" }, { status: 404 });
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
        organizationId: ctx.orgId,
        businessId: data.businessId,
        action: "RECORD_PAYMENT",
        entity: "Payment",
        entityId: payment.id,
        newValue: { amount: data.amount, referenceNo: data.referenceNo },
        description: `Recorded payment: ${data.description}`,
      },
    });

    revalidatePath("/payments");
    revalidatePath("/dashboard");
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

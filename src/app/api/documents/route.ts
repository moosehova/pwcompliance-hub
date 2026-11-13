import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { getOrgContext } from "@/lib/session";

const schema = z.object({
  businessId: z.string().min(1),
  authorityId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default("OTHER"),
  url: z.string().url("Invalid URL").optional(),
  periodLabel: z.string().optional(),
  expiryDate: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();
    const body = await req.json();
    const data = schema.parse(body);

    if (!ctx.businessIds.includes(data.businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    const doc = await prisma.document.create({
      data: {
        ...data,
        organizationId: ctx.orgId,
        category: data.category as never,
        uploadedById: session.user.id,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: ctx.orgId,
        businessId: data.businessId,
        action: "CREATE",
        entity: "Document",
        entityId: doc.id,
        newValue: { name: data.name },
        description: `Uploaded document: ${data.name}`,
      },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("[POST /api/documents]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

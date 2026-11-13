import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  businessId: z.string(),
  authorityId: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().default("OTHER"),
  url: z.string().url(),
  periodLabel: z.string().optional(),
  expiryDate: z.string().optional(),
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

    const doc = await prisma.document.create({
      data: {
        ...data,
        category: data.category as never,
        uploadedById: session.user.id,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
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
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

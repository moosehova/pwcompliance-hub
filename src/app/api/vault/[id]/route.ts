import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const ctx = await getOrgContext();

    // Try Document first
    const doc = await prisma.document.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true, businessId: true },
    });

    if (doc) {
      await prisma.document.update({
        where: { id },
        data: { deletedAt: new Date(), status: "DELETED" },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId: ctx.orgId,
          businessId: doc.businessId,
          action: "DELETE",
          entity: "Document",
          entityId: id,
          description: `Deleted document: ${doc.name}`,
        },
      });
      return NextResponse.json({ deleted: true });
    }

    // Try TaxReturnDocument
    const taxDoc = await prisma.taxReturnDocument.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true, businessId: true, taxReturnId: true },
    });

    if (taxDoc) {
      await prisma.taxReturnDocument.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId: ctx.orgId,
          businessId: taxDoc.businessId,
          taxReturnId: taxDoc.taxReturnId,
          action: "DELETE",
          entity: "TaxReturnDocument",
          entityId: id,
          description: `Deleted tax document: ${taxDoc.name}`,
        },
      });
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  } catch (error) {
    console.error("[DELETE /api/vault/[id]]", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

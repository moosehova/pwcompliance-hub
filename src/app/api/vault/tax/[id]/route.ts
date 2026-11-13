import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();
    if (!hasPermission(ctx.role, "document:manage")) {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const { id } = await params;

    const doc = await prisma.taxReturnDocument.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true, businessId: true, blobUrl: true },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (doc.blobUrl) {
      await del(doc.blobUrl).catch((e) =>
        console.warn("[vault/tax delete] blob delete failed:", e)
      );
    }

    await prisma.taxReturnDocument.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: ctx.orgId,
        businessId: doc.businessId,
        action: "DELETE",
        entity: "TaxReturnDocument",
        entityId: id,
        description: `Deleted tax document: ${doc.name}`,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/vault/tax/[id]]", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}

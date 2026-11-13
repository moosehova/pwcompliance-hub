import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();
    const { id } = await params;

    const doc = await prisma.taxReturnDocument.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true, mimeType: true, blobUrl: true, businessId: true },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!doc.blobUrl) return NextResponse.json({ error: "No file stored" }, { status: 404 });

    const upstream = await fetch(doc.blobUrl);
    if (!upstream.ok) return NextResponse.json({ error: "File unavailable" }, { status: 502 });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: ctx.orgId,
        businessId: doc.businessId,
        action: "READ",
        entity: "TaxReturnDocument",
        entityId: doc.id,
        description: `Downloaded tax document: ${doc.name}`,
      },
    });

    const contentType = doc.mimeType || "application/octet-stream";
    const filename = encodeURIComponent(doc.name);

    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[GET /api/vault/tax/[id]/download]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

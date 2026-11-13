import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();

    if (!hasPermission(ctx.role, "document:view")) {
      return NextResponse.json({ error: "Forbidden: document:view required" }, { status: 403 });
    }

    const { id } = await params;

    const doc = await prisma.document.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, name: true, mimeType: true, blobUrl: true, url: true },
    });

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Support legacy documents that only have a `url` field (pre-Blob migration)
    const fileUrl = doc.blobUrl ?? doc.url;
    if (!fileUrl) return NextResponse.json({ error: "No file stored" }, { status: 404 });

    let upstream: Response;
    try {
      upstream = await fetch(fileUrl);
    } catch {
      return NextResponse.json({ error: "File storage unavailable" }, { status: 502 });
    }
    if (!upstream.ok) return NextResponse.json({ error: "File unavailable" }, { status: 502 });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: ctx.orgId,
        action: "READ",
        entity: "Document",
        entityId: doc.id,
        description: `Downloaded document: ${doc.name}`,
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
    console.error("[GET /api/vault/[id]/download]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

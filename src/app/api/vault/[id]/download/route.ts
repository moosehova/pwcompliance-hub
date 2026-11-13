import { NextResponse } from "next/server";
import { createReadStream, existsSync, statSync } from "fs";
import { Readable } from "stream";
import path from "path";
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

    const { id } = await params;
    const ctx = await getOrgContext();

    // Look up in both document tables
    let storagePath: string | null = null;
    let mimeType: string | null = null;
    let name = "document";

    const doc = await prisma.document.findFirst({
      where: { id, organizationId: ctx.orgId, deletedAt: null },
      select: { storagePath: true, mimeType: true, name: true },
    });

    if (doc) {
      storagePath = doc.storagePath;
      mimeType = doc.mimeType;
      name = doc.name;
    } else {
      const taxDoc = await prisma.taxReturnDocument.findFirst({
        where: { id, organizationId: ctx.orgId, deletedAt: null },
        select: { storagePath: true, mimeType: true, name: true },
      });
      if (taxDoc) {
        storagePath = taxDoc.storagePath;
        mimeType = taxDoc.mimeType;
        name = taxDoc.name;
      }
    }

    if (!storagePath) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!existsSync(storagePath)) {
      return NextResponse.json({ error: "File not found on server" }, { status: 404 });
    }

    const stat = statSync(storagePath);
    const ext = path.extname(storagePath);
    const disposition = `attachment; filename="${encodeURIComponent(name)}${ext}"`;

    // Stream the file
    const nodeStream = createReadStream(storagePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": mimeType ?? "application/octet-stream",
        "Content-Disposition": disposition,
        "Content-Length": String(stat.size),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[GET /api/vault/[id]/download]", error);
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}

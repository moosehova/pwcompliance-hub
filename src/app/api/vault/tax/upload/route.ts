import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import type { TaxDocumentCategory } from "@prisma/client";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv",
]);
const MAX_BYTES = 25 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();
    const fd = await req.formData();

    const file = fd.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: "File type not permitted" }, { status: 422 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 25 MB" }, { status: 422 });

    const taxReturnId = fd.get("taxReturnId") as string | null;
    const businessId = fd.get("businessId") as string | null;
    if (!taxReturnId || !businessId) {
      return NextResponse.json({ error: "taxReturnId and businessId required" }, { status: 400 });
    }
    if (!ctx.businessIds.includes(businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    // Verify tax return belongs to this org
    const taxReturn = await prisma.taxReturn.findFirst({
      where: { id: taxReturnId, organizationId: ctx.orgId },
      select: { id: true, taxYear: true },
    });
    if (!taxReturn) return NextResponse.json({ error: "Tax return not found" }, { status: 404 });

    const name = (fd.get("name") as string | null) || file.name;
    const description = fd.get("description") as string | undefined ?? undefined;
    const category = (fd.get("category") as TaxDocumentCategory | null) || "OTHER_SUPPORTING";
    const replaceDocId = fd.get("replaceDocId") as string | null;

    let versionOf: string | undefined;
    let versionNumber = 1;
    if (replaceDocId) {
      const existing = await prisma.taxReturnDocument.findFirst({
        where: { id: replaceDocId, organizationId: ctx.orgId, deletedAt: null },
        select: { id: true, versionNumber: true },
      });
      if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      versionOf = existing.id;
      versionNumber = existing.versionNumber + 1;
    }

    const docId = crypto.randomUUID().replace(/-/g, "");
    const blobPath = `vault-tax/${ctx.orgId}/${taxReturnId}/${docId}/${file.name}`;
    const blob = await put(blobPath, file, { access: "public" });

    const doc = await prisma.taxReturnDocument.create({
      data: {
        organizationId: ctx.orgId,
        taxReturnId,
        businessId,
        uploadedById: session.user.id,
        name,
        description,
        category: category as TaxDocumentCategory,
        taxYear: taxReturn.taxYear,
        mimeType: file.type,
        size: file.size,
        blobUrl: blob.url,
        versionNumber,
        versionOf,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        organizationId: ctx.orgId,
        businessId,
        action: "CREATE",
        entity: "TaxReturnDocument",
        entityId: doc.id,
        newValue: { name, category, taxReturnId, versionNumber },
        description: versionOf
          ? `Uploaded replacement tax document v${versionNumber}: ${name}`
          : `Uploaded tax document: ${name}`,
      },
    });

    return NextResponse.json({ id: doc.id, name: doc.name }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/vault/tax/upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

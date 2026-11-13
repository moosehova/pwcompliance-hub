import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { validateUploadedFile, validationErrorMessage } from "@/lib/vault-validation";
import type { TaxDocumentCategory } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();

    // Require tax:prepare or document:manage to upload tax documents
    if (!hasPermission(ctx.role, "tax:prepare") && !hasPermission(ctx.role, "document:manage")) {
      return NextResponse.json({ error: "Forbidden: tax:prepare or document:manage required" }, { status: 403 });
    }

    const fd = await req.formData();
    const file = fd.get("file") as File | null;

    const validationError = validateUploadedFile(
      file ? { name: file.name, type: file.type, size: file.size } : null as never
    );
    if (validationError) {
      return NextResponse.json({ error: validationErrorMessage(validationError) }, { status: 422 });
    }

    const taxReturnId = fd.get("taxReturnId") as string | null;
    const businessId = fd.get("businessId") as string | null;
    if (!taxReturnId || !businessId) {
      return NextResponse.json({ error: "taxReturnId and businessId required" }, { status: 400 });
    }
    if (!ctx.businessIds.includes(businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    const taxReturn = await prisma.taxReturn.findFirst({
      where: { id: taxReturnId, organizationId: ctx.orgId },
      select: { id: true, taxYear: true },
    });
    if (!taxReturn) return NextResponse.json({ error: "Tax return not found" }, { status: 404 });

    const name = (fd.get("name") as string | null) || file!.name;
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

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[vault/tax/upload] BLOB_READ_WRITE_TOKEN is not configured");
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }

    const docId = crypto.randomUUID().replace(/-/g, "");
    const blobPath = `vault-tax/${ctx.orgId}/${taxReturnId}/${docId}/${file!.name}`;

    let blob: { url: string };
    try {
      blob = await put(blobPath, file!, { access: "public" });
    } catch (blobErr) {
      console.error("[vault/tax/upload] Vercel Blob error:", blobErr);
      return NextResponse.json({ error: "File storage unavailable, please try again later" }, { status: 503 });
    }

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
        mimeType: file!.type,
        size: file!.size,
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

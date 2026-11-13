import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { validateUploadedFile, validationErrorMessage } from "@/lib/vault-validation";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();

    if (!hasPermission(ctx.role, "document:manage")) {
      return NextResponse.json({ error: "Forbidden: document:manage required" }, { status: 403 });
    }

    const fd = await req.formData();
    const file = fd.get("file") as File | null;

    const validationError = validateUploadedFile(
      file ? { name: file.name, type: file.type, size: file.size } : null as never
    );
    if (validationError) {
      return NextResponse.json({ error: validationErrorMessage(validationError) }, { status: 422 });
    }

    const businessId = fd.get("businessId") as string | null;
    if (!businessId || !ctx.businessIds.includes(businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    const name = (fd.get("name") as string | null) || file!.name;
    const description = fd.get("description") as string | undefined ?? undefined;
    const category = (fd.get("category") as string | null) || "OTHER";
    const authorityId = fd.get("authorityId") as string | undefined ?? undefined;
    const periodLabel = fd.get("periodLabel") as string | undefined ?? undefined;
    const expiryDate = fd.get("expiryDate") as string | undefined ?? undefined;
    const replaceDocId = fd.get("replaceDocId") as string | null;

    let versionOf: string | undefined;
    let versionNumber = 1;
    if (replaceDocId) {
      const existing = await prisma.document.findFirst({
        where: { id: replaceDocId, organizationId: ctx.orgId, deletedAt: null },
        select: { id: true, versionNumber: true },
      });
      if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      versionOf = existing.id;
      versionNumber = existing.versionNumber + 1;

      await prisma.document.update({
        where: { id: replaceDocId },
        data: { status: "SUPERSEDED" },
      });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("[vault/upload] BLOB_READ_WRITE_TOKEN is not configured");
      return NextResponse.json({ error: "File storage is not configured" }, { status: 503 });
    }

    const docId = crypto.randomUUID().replace(/-/g, "");
    const blobPath = `vault/${ctx.orgId}/${businessId}/${docId}/${file!.name}`;

    let blob: { url: string };
    try {
      blob = await put(blobPath, file!, { access: "public" });
    } catch (blobErr) {
      console.error("[vault/upload] Vercel Blob error:", blobErr);
      return NextResponse.json({ error: "File storage unavailable, please try again later" }, { status: 503 });
    }

    const doc = await prisma.document.create({
      data: {
        organizationId: ctx.orgId,
        businessId,
        authorityId: authorityId || undefined,
        obligationId: undefined,
        uploadedById: session.user.id,
        name,
        description,
        category: category as never,
        mimeType: file!.type,
        size: file!.size,
        blobUrl: blob.url,
        periodLabel,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
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
        entity: "Document",
        entityId: doc.id,
        newValue: { name, mimeType: file!.type, size: file!.size, versionNumber },
        description: versionOf
          ? `Uploaded replacement document v${versionNumber}: ${name}`
          : `Uploaded document: ${name}`,
      },
    });

    return NextResponse.json({ id: doc.id, name: doc.name }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/vault/upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

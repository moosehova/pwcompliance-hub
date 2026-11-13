import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { randomUUID } from "crypto";

const PRIVATE_DIR = path.join(process.cwd(), "private", "uploads");

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
]);

const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await getOrgContext();
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 25 MB limit" }, { status: 400 });
    }

    const businessId = formData.get("businessId") as string | null;
    const taxReturnId = formData.get("taxReturnId") as string | null;
    const name = (formData.get("name") as string | null) || file.name;
    const description = formData.get("description") as string | null;
    const category = (formData.get("category") as string | null) || "OTHER";
    const periodLabel = formData.get("periodLabel") as string | null;
    const expiryDate = formData.get("expiryDate") as string | null;
    const replaceDocId = formData.get("replaceDocId") as string | null; // existing doc to version

    if (!businessId) {
      return NextResponse.json({ error: "businessId is required" }, { status: 400 });
    }

    if (!ctx.businessIds.includes(businessId)) {
      return NextResponse.json({ error: "Business not found" }, { status: 403 });
    }

    // Determine version number
    let versionNumber = 1;
    let versionOf: string | null = null;

    if (replaceDocId) {
      const existing = taxReturnId
        ? await prisma.taxReturnDocument.findFirst({
            where: { id: replaceDocId, organizationId: ctx.orgId, deletedAt: null },
            select: { id: true, versionOf: true, versionNumber: true },
          })
        : await prisma.document.findFirst({
            where: { id: replaceDocId, organizationId: ctx.orgId, deletedAt: null },
            select: { id: true, versionOf: true, versionNumber: true },
          });

      if (existing) {
        const rootId = existing.versionOf ?? existing.id;
        versionOf = rootId;
        // Find highest version for this root
        const highest = taxReturnId
          ? await prisma.taxReturnDocument.aggregate({
              where: { versionOf: rootId, deletedAt: null },
              _max: { versionNumber: true },
            })
          : await prisma.document.aggregate({
              where: { versionOf: rootId, deletedAt: null },
              _max: { versionNumber: true },
            });
        const maxVer = highest._max.versionNumber ?? existing.versionNumber;
        versionNumber = maxVer + 1;
      }
    }

    // Build safe filename and path
    const docId = randomUUID().replace(/-/g, "");
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const folder = taxReturnId
      ? path.join(PRIVATE_DIR, ctx.orgId, businessId, "tax", taxReturnId, docId)
      : path.join(PRIVATE_DIR, ctx.orgId, businessId, docId);

    if (!existsSync(folder)) {
      await mkdir(folder, { recursive: true });
    }

    const storagePath = path.join(folder, safeFilename);
    const bytes = await file.arrayBuffer();
    await writeFile(storagePath, Buffer.from(bytes));

    // Persist to DB
    if (taxReturnId) {
      // Verify tax return ownership
      const tr = await prisma.taxReturn.findFirst({
        where: { id: taxReturnId, organizationId: ctx.orgId },
        select: { id: true },
      });
      if (!tr) return NextResponse.json({ error: "Tax return not found" }, { status: 403 });

      const doc = await prisma.taxReturnDocument.create({
        data: {
          id: docId,
          organizationId: ctx.orgId,
          taxReturnId,
          businessId,
          uploadedById: session.user.id,
          name,
          description,
          category,
          mimeType: file.type,
          size: file.size,
          storagePath,
          versionNumber,
          versionOf,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          organizationId: ctx.orgId,
          businessId,
          taxReturnId,
          action: "CREATE",
          entity: "TaxReturnDocument",
          entityId: doc.id,
          newValue: { name, versionNumber },
          description: `Uploaded tax document v${versionNumber}: ${name}`,
        },
      });

      return NextResponse.json({ id: doc.id, name: doc.name, size: doc.size, versionNumber }, { status: 201 });
    } else {
      const doc = await prisma.document.create({
        data: {
          id: docId,
          organizationId: ctx.orgId,
          businessId,
          uploadedById: session.user.id,
          name,
          description,
          category: category as never,
          mimeType: file.type,
          size: file.size,
          storagePath,
          periodLabel,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
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
          newValue: { name, versionNumber },
          description: `Uploaded document v${versionNumber}: ${name}`,
        },
      });

      return NextResponse.json({ id: doc.id, name: doc.name, size: doc.size, versionNumber }, { status: 201 });
    }
  } catch (error) {
    console.error("[POST /api/vault/upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

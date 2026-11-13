import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/lib/session";

export async function GET() {
  try {
    const ctx = await getOrgContext();

    const businesses = await prisma.business.findMany({
      where: { organizationId: ctx.orgId, deletedAt: null },
      select: { id: true, legalName: true, tradingName: true },
      orderBy: { legalName: "asc" },
    });

    return NextResponse.json(businesses);
  } catch {
    return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 });
  }
}

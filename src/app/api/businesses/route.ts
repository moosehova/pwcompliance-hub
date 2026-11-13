import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
    if (!membership) return NextResponse.json([], { status: 200 });

    const businesses = await prisma.business.findMany({
      where: { organizationId: membership.organizationId, deletedAt: null },
      select: { id: true, legalName: true, tradingName: true },
      orderBy: { legalName: "asc" },
    });

    return NextResponse.json(businesses);
  } catch {
    return NextResponse.json({ error: "Failed to fetch businesses" }, { status: 500 });
  }
}

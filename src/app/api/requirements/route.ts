import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const requirements = await prisma.complianceRequirement.findMany({
      where: { active: true },
      select: { id: true, name: true, authorityId: true, frequency: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(requirements);
  } catch {
    return NextResponse.json({ error: "Failed to fetch requirements" }, { status: 500 });
  }
}

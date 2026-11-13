import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const authorities = await prisma.authority.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(authorities);
  } catch {
    return NextResponse.json({ error: "Failed to fetch authorities" }, { status: 500 });
  }
}

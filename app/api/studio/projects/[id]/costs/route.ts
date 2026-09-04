import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const entries = await prisma.costEntry.findMany({
    where: { projectId: id, project: { userId: user.id } },
    orderBy: { createdAt: "asc" },
  });

  const byCategory: Record<string, number> = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
  }

  const total = Object.values(byCategory).reduce((a, b) => a + b, 0);

  return NextResponse.json({
    entries,
    summary: byCategory,
    total,
  });
}

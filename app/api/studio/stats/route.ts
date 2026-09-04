import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getProviderStatus } from "@/providers";

export async function GET() {
  const user = await getSessionUser();

  const [total, rendering, completed, published] = await Promise.all([
    prisma.project.count({ where: { userId: user.id, projectKind: "STORY_STUDIO" } }),
    prisma.project.count({
      where: {
        userId: user.id,
        projectKind: "STORY_STUDIO",
        studioStatus: { in: ["RENDERING", "STORY_GENERATING", "AI_SHOTS_GENERATING", "VOICE_GENERATING"] },
      },
    }),
    prisma.project.count({
      where: { userId: user.id, projectKind: "STORY_STUDIO", status: "COMPLETED" },
    }),
    prisma.project.count({
      where: { userId: user.id, projectKind: "STORY_STUDIO", studioStatus: "PUBLISHED" },
    }),
  ]);

  const costAgg = await prisma.costEntry.aggregate({
    where: { project: { userId: user.id, projectKind: "STORY_STUDIO" } },
    _sum: { amount: true },
  });

  const providers = await getProviderStatus();

  return NextResponse.json({
    stats: {
      projects: total,
      rendering,
      completed,
      published,
      creditsUsed: costAgg._sum.amount ?? 0,
    },
    providers,
  });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();

  const jobs = await prisma.generationJob.findMany({
    where: { project: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      project: { select: { id: true, title: true, projectKind: true } },
    },
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      projectId: j.projectId,
      projectTitle: j.project.title,
      projectKind: j.project.projectKind,
      type: j.type,
      status: j.status,
      step: j.step,
      progress: j.progress,
      error: j.error,
      retryCount: j.retryCount,
      metadata: j.metadata,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
    })),
  });
}

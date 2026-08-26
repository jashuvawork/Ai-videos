import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getJobQueue } from "@/jobs/queue";
import { initializeWorker } from "@/workers/worker";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    initializeWorker();
    const { id } = await params;
    const user = await getSessionUser();

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const job = await prisma.generationJob.create({
      data: {
        projectId: id,
        type: "VIDEO_GENERATION",
        status: "PENDING",
        step: "CREATE_SCRIPT",
        progress: 0,
      },
    });

    await prisma.project.update({
      where: { id },
      data: { status: "GENERATING" },
    });

    const queue = getJobQueue();
    await queue.enqueue({
      id: job.id,
      type: "VIDEO_GENERATION",
      projectId: id,
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

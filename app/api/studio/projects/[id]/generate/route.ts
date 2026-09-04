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
      where: { id, userId: user.id, projectKind: "STORY_STUDIO" },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!project.storyPlan) {
      return NextResponse.json(
        { error: "Generate story plan before rendering" },
        { status: 400 },
      );
    }

    if (project.assetRights === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Cannot render — asset rights marked unauthorized" },
        { status: 400 },
      );
    }

    const job = await prisma.generationJob.create({
      data: {
        projectId: id,
        type: "VIDEO_GENERATION",
        status: "PENDING",
        step: "CREATE_SCENES",
        progress: 0,
        metadata: { pipeline: "story_studio" },
      },
    });

    await prisma.project.update({
      where: { id },
      data: { status: "GENERATING", studioStatus: "STORYBOARD_READY" },
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

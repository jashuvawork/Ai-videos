import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getJobQueue } from "@/jobs/queue";
import { initializeWorker } from "@/workers/worker";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
) {
  try {
    initializeWorker();
    const { id, sceneId } = await params;
    const user = await getSessionUser();

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const scene = await prisma.scene.findFirst({
      where: { id: sceneId, projectId: id },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    const job = await prisma.generationJob.create({
      data: {
        projectId: id,
        type: "SCENE_REGENERATION",
        status: "PENDING",
        step: "GENERATE_VISUALS",
        sceneId,
        progress: 0,
      },
    });

    const queue = getJobQueue();
    await queue.enqueue({
      id: job.id,
      type: "SCENE_REGENERATION",
      projectId: id,
      sceneId,
    });

    return NextResponse.json({ job });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Regeneration failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

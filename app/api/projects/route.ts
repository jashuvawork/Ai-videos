import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CreateProjectSchema } from "@/lib/schemas";
import { CostTrackingService } from "@/services/cost-tracking";

export async function GET() {
  const user = await getSessionUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const data = CreateProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        idea: data.idea,
        videoType: (data.videoType as never) || "STORY",
        platform: (data.platform as never) || "INSTAGRAM_REEL",
        aspectRatio: (data.aspectRatio as never) || "RATIO_9_16",
        duration: data.duration || 30,
        visualStyle: (data.visualStyle as never) || "CINEMATIC",
        voice: (data.voice as never) || "MALE",
        language: data.language || "en",
        generationMode: data.generationMode || "FAST",
        visualGenerationMode: data.visualGenerationMode || "AUTOMATIC",
        status: "DRAFT",
      },
    });

    const costTracker = new CostTrackingService();
    const estimatedCost = await costTracker.estimate(project.id);

    return NextResponse.json({ project: { ...project, estimatedCost } }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

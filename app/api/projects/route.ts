import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CreateProjectSchema } from "@/lib/schemas";
import { formatZodError } from "@/lib/story-studio/schemas";
import { CostTrackingService } from "@/services/cost-tracking";
import { withResolvedAssetUrls } from "@/lib/asset-url";

export async function GET() {
  const user = await getSessionUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ projects: projects.map(withResolvedAssetUrls) });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const data = parsed.data;

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
    const raw = error instanceof Error ? error.message : "Failed to create project";
    const message = raw.includes("DATABASE_URL")
      ? "Database not configured. Deploy on Railway with DATABASE_URL, or set NEXT_PUBLIC_API_BASE_URL on Vercel."
      : raw;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

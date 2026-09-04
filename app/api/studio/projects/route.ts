import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { CreateStoryProjectSchema, formatZodError } from "@/lib/story-studio/schemas";
import { withResolvedAssetUrls } from "@/lib/asset-url";

export async function GET() {
  const user = await getSessionUser();
  const projects = await prisma.project.findMany({
    where: { userId: user.id, projectKind: "STORY_STUDIO" },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ projects: projects.map(withResolvedAssetUrls) });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const body = await request.json();
    const parsed = CreateStoryProjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: formatZodError(parsed.error) }, { status: 400 });
    }
    const data = parsed.data;

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        idea: data.idea,
        projectKind: "STORY_STUDIO",
        studioStatus: "DRAFT",
        genre: data.genre,
        narrationStyle: data.narrationStyle,
        pacing: data.pacing,
        targetAudience: data.targetAudience,
        gameplaySource: data.gameplaySource,
        assetRights: data.assetRights,
        studioSettings: data.advanced ?? {},
        videoType: "CINEMATIC",
        platform: "YOUTUBE",
        aspectRatio: "RATIO_16_9",
        duration: data.durationMinutes * 60,
        visualStyle: "CINEMATIC",
        voice: data.voice,
        language: data.language,
        generationMode: "CINEMATIC",
        visualGenerationMode: "AUTOMATIC",
        status: "DRAFT",
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create story project";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

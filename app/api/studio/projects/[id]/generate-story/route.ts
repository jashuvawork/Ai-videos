import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { StoryDirectorService } from "@/services/story-director";
import { CreateStoryProjectSchema } from "@/lib/story-studio/schemas";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getSessionUser();
    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id, projectKind: "STORY_STUDIO" },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    await prisma.project.update({
      where: { id },
      data: { studioStatus: "STORY_GENERATING" },
    });

    const input = CreateStoryProjectSchema.parse({
      idea: project.idea,
      genre: project.genre ?? "Crime Thriller",
      durationMinutes: Math.max(1, Math.round(project.duration / 60)),
      visualStyle: project.studioSettings
        ? (project.studioSettings as { visualStyle?: string }).visualStyle ?? "Cinematic GTA"
        : "Cinematic GTA",
      narrationStyle: project.narrationStyle ?? "Deep cinematic male",
      language: project.language,
      targetAudience: project.targetAudience ?? "YouTube 18-34",
      gameplaySource: project.gameplaySource ?? "User upload",
      voice: project.voice,
      musicStyle: "Suspense",
      pacing: project.pacing ?? "fast",
      assetRights: project.assetRights ?? "OWNED",
      advanced: project.studioSettings ?? undefined,
    });

    const director = new StoryDirectorService();
    const storyPlan = await director.generate(input);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        title: storyPlan.title,
        hook: storyPlan.logline,
        summary: storyPlan.logline,
        tone: storyPlan.tone,
        storyPlan: storyPlan as object,
        studioStatus: "STORY_READY",
        status: "DRAFT",
      },
    });

    return NextResponse.json({ project: updated, storyPlan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Story generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

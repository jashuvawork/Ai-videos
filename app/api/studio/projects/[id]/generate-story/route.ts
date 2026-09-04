import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { StoryDirectorService } from "@/services/story-director";
import {
  CreateStoryProjectSchema,
  formatZodError,
  normalizePacing,
  normalizeVoice,
  pickStudioAdvancedSettings,
} from "@/lib/story-studio/schemas";

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

    const settings = (project.studioSettings ?? {}) as Record<string, unknown>;

    const parsed = CreateStoryProjectSchema.safeParse({
      idea: project.idea,
      genre: project.genre ?? "Crime Thriller",
      durationMinutes: Math.max(1, Math.round(project.duration / 60)),
      visualStyle:
        typeof settings.visualStyle === "string" ? settings.visualStyle : "Cinematic GTA",
      narrationStyle: project.narrationStyle ?? "Deep cinematic male",
      language: project.language || "en",
      targetAudience: project.targetAudience ?? "YouTube 18-34",
      gameplaySource: project.gameplaySource ?? "User upload",
      voice: normalizeVoice(project.voice),
      musicStyle: typeof settings.musicStyle === "string" ? settings.musicStyle : "Suspense",
      pacing: normalizePacing(project.pacing),
      assetRights: project.assetRights ?? "OWNED",
      advanced: pickStudioAdvancedSettings(project.studioSettings),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: formatZodError(parsed.error) },
        { status: 400 },
      );
    }

    const director = new StoryDirectorService();
    const storyPlan = await director.generate(parsed.data);

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

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { parseStoryPlan } from "@/services/story-plan-hydrator";
import { hydrateStoryPlan } from "@/services/story-plan-hydrator";
import { findBestGameplayMatch } from "@/services/gameplay-matcher";
import { attachGameplayClipToScene } from "@/services/gameplay-attach";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id, projectKind: "STORY_STUDIO" },
    });
    if (!project?.storyPlan) {
      return NextResponse.json({ error: "Story plan required" }, { status: 400 });
    }

    const plan = parseStoryPlan(project.storyPlan);
    const { scenes } = await hydrateStoryPlan(id, plan);

    const clips = await prisma.gameplayClip.findMany({
      where: { userId: user.id, status: "ready" },
    });

    const matches: Array<{ sceneId: string; clipId: string; score: number }> = [];

    for (const { record, storyScene } of scenes) {
      if (storyScene.aiVideoRequired) continue;
      const match = findBestGameplayMatch(
        clips.map((c) => ({
          id: c.id,
          tags: c.tags,
          metadata: c.metadata as Record<string, unknown> | null,
          duration: c.duration,
        })),
        storyScene,
      );
      if (match) {
        const clip = clips.find((c) => c.id === match.clipId);
        if (clip) {
          await attachGameplayClipToScene(id, record.id, clip, match.score);
          matches.push({ sceneId: record.id, clipId: clip.id, score: match.score });
        }
      }
    }

    await prisma.project.update({
      where: { id },
      data: { studioStatus: "ASSETS_MATCHING" },
    });

    return NextResponse.json({ matched: matches.length, matches });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gameplay matching failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

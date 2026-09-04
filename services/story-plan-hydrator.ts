import { prisma } from "@/lib/db";
import { StoryPlanSchema, type StoryPlan, type StoryScene } from "@/lib/story-studio/schemas";

export interface HydratedScene {
  record: {
    id: string;
    sceneNumber: number;
    sceneKey: string | null;
    duration: number;
    narration: string | null;
    visualDescription: string | null;
    visualPrompt: string | null;
    negativePrompt: string | null;
    cameraMovement: string | null;
    musicMood: string | null;
    soundEffects: unknown;
    transition: string | null;
    emotion: string | null;
    alternatives: unknown;
  };
  storyScene: StoryScene;
}

export interface StoryPlanHydrationResult {
  characters: Array<{ id: string; name: string }>;
  scenes: HydratedScene[];
}

export function buildSceneStudioMeta(scene: StoryScene) {
  return {
    aiVideoRequired: scene.aiVideoRequired,
    imageRequired: scene.imageRequired,
    gameplaySearchTerms: scene.gameplaySearchTerms,
    voiceDirection: scene.voiceDirection,
    location: scene.location,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather,
    purpose: scene.purpose,
    matchedClipId: null as string | null,
    matchScore: null as number | null,
    videoProvider: null as string | null,
  };
}

export async function hydrateStoryPlan(projectId: string, rawPlan: unknown): Promise<StoryPlanHydrationResult> {
  const plan = StoryPlanSchema.parse(rawPlan);
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new Error("Project not found");

  await prisma.character.deleteMany({ where: { projectId } });
  await prisma.scene.deleteMany({ where: { projectId } });

  const characters = [];
  for (const c of plan.characters) {
    const char = await prisma.character.create({
      data: {
        userId: project.userId,
        projectId,
        name: c.name,
        appearance: c.appearance ?? c.description,
        clothing: c.clothing,
        personality: c.personality,
        visualIdentity: c.description,
        visualToken: c.id,
      },
    });
    characters.push({ id: char.id, name: char.name });
  }

  const scenes: HydratedScene[] = [];
  for (let i = 0; i < plan.scenes.length; i++) {
    const s = plan.scenes[i];
    const record = await prisma.scene.create({
      data: {
        projectId,
        sceneNumber: i + 1,
        sceneKey: s.sceneId,
        duration: s.duration,
        narration: s.narration,
        dialogue: s.dialogue.length ? JSON.stringify(s.dialogue) : null,
        visualDescription: s.visualDescription,
        visualPrompt: s.aiVideoPrompt || s.visualDescription,
        cameraMovement: s.camera,
        environment: [s.location, s.timeOfDay, s.weather].filter(Boolean).join(", "),
        soundEffects: s.soundEffects,
        musicMood: s.musicMood,
        transition: s.transition,
        emotion: s.emotion,
        status: "pending",
        alternatives: { storyStudio: buildSceneStudioMeta(s) },
      },
    });
    scenes.push({ record, storyScene: s });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      title: plan.title,
      hook: plan.logline,
      summary: plan.logline,
      tone: plan.tone,
      studioStatus: "STORYBOARD_READY",
    },
  });

  return { characters, scenes };
}

export function parseStoryPlan(raw: unknown): StoryPlan {
  return StoryPlanSchema.parse(raw);
}

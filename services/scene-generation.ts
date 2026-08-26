import { createProviders } from "@/providers";
import { buildContinuityBible } from "@/lib/director/continuity";
import { isProcessVideo, resolveContentType } from "@/lib/director/detect";
import { buildVisualPrompt } from "@/lib/director/visual-prompt";
import { validateSceneDescription, REAL_WORLD_ACTION_SUFFIX } from "@/lib/director/no-text";
import type { SceneTemplate } from "@/lib/director/types";
import type { ReferenceStyleProfile } from "@/lib/schemas/reference-style";
import { sceneVisualPrompt } from "@/lib/prompts";
import { VisualPromptSchema } from "@/lib/schemas";
import { parseAiJson } from "@/lib/utils";
import type { SceneData } from "@/lib/schemas";
import { CharacterConsistencyService } from "./character-consistency";
import { CostTrackingService } from "./cost-tracking";
import { IndustrialRealismService } from "./industrial-realism";
import { CameraEngineService } from "./camera-engine";
import { VisualConsistencyCheckService } from "./visual-consistency-check";
import { ReferenceAnalysisService } from "./reference-analysis";

export type SceneVisualPromptOptions = {
  idea?: string;
  videoType?: string;
  aspectRatio?: string;
  referenceStyle?: ReferenceStyleProfile | null;
};

export class SceneGenerationService {
  private characterService = new CharacterConsistencyService();
  private costTracker = new CostTrackingService();
  private industrialRealism = new IndustrialRealismService();
  private cameraEngine = new CameraEngineService();
  private consistencyCheck = new VisualConsistencyCheckService();
  private referenceAnalysis = new ReferenceAnalysisService();

  async generateVisualPrompts(
    scenes: SceneData[],
    characters: Array<{ name: string; visualToken?: string | null; visualIdentity?: string | null }>,
    visualStyle: string,
    aspectRatio: string,
    projectId?: string,
    idea?: string,
    options?: SceneVisualPromptOptions,
  ) {
    const videoType = options?.videoType;
    const referenceStyle = options?.referenceStyle;
    const contentType = idea ? resolveContentType(idea, videoType) : "narrative";
    const useProcessDirector = isProcessVideo(contentType, videoType);

    if (useProcessDirector && idea) {
      const continuity = buildContinuityBible(contentType, idea);

      return scenes.map((scene) => {
        const template = sceneToTemplate(scene);
        const sceneKey = (scene as SceneData & { sceneKey?: string }).sceneKey || template.key;
        const camera = this.cameraEngine.selectForAction(
          sceneKey,
          template.cameraMovement,
          template.cameraAngle,
        );
        template.cameraMovement = camera.cameraMovement;
        template.cameraAngle = camera.cameraAngle;

        const industrialTemplate = this.industrialRealism.applyToSceneTemplate(template);
        let built = buildVisualPrompt({
          scene: industrialTemplate,
          continuity,
          visualStyle,
          aspectRatio,
          characters: [], // no portrait character injection for process videos
        });

        if (referenceStyle) {
          built.visualPrompt = this.referenceAnalysis.applyToPrompt(built.visualPrompt, referenceStyle);
        }

        const check = this.consistencyCheck.checkScene(scene, {
          aspectRatio,
          referenceStyle,
          isProcessVideo: true,
        });

        if (!check.valid) {
          built.visualPrompt = this.consistencyCheck.repairPrompt(built.visualPrompt, true);
        }

        const validation = validateSceneDescription(built.visualPrompt);
        if (!validation.valid) {
          built.visualPrompt = `${built.visualPrompt}. ${REAL_WORLD_ACTION_SUFFIX}`;
        }

        return {
          sceneNumber: scene.sceneNumber,
          visualPrompt: built.visualPrompt,
          negativePrompt: this.industrialRealism.enrichNegativePrompt(built.negativePrompt),
          duration: scene.duration,
          cameraShot: built.cameraShot,
          cameraMovement: built.cameraMovement,
          lighting: built.lighting,
          environment: built.environment,
          emotion: built.emotion,
          transition: scene.transition || "cut",
        };
      });
    }

    const providers = createProviders();

    if (providers.llm.name === "studio" || providers.llm.name === "mock") {
      const continuity = idea ? buildContinuityBible(contentType, idea) : null;

      return scenes.map((scene) => {
        const template = sceneToTemplate(scene);
        const built = buildVisualPrompt({
          scene: template,
          continuity: continuity!,
          visualStyle,
          aspectRatio,
          characters,
        });
        const visualPrompt = this.characterService.enrichPromptWithCharacters(
          built.visualPrompt,
          characters,
        );
        return {
          sceneNumber: scene.sceneNumber,
          visualPrompt,
          negativePrompt: built.negativePrompt,
          duration: scene.duration,
          cameraShot: built.cameraShot,
          cameraMovement: built.cameraMovement,
          lighting: built.lighting,
          environment: built.environment,
          emotion: built.emotion,
          transition: scene.transition || "cut",
        };
      });
    }

    const results = [];

    for (const scene of scenes) {
      const prompt = sceneVisualPrompt({
        scene,
        characters: characters.map((c) => ({
          name: c.name,
          visualToken: c.visualToken ?? undefined,
          visualIdentity: c.visualIdentity ?? undefined,
        })),
        visualStyle,
        aspectRatio,
      });

      const response = await providers.llm.generate({ prompt, jsonMode: true });

      if (projectId) {
        await this.costTracker.track({
          projectId,
          category: "llm",
          provider: response.provider,
          operation: "scene_visual_prompt",
          amount: response.cost || 0.003,
        });
      }

      const visual = await parseAiJson(response.text, VisualPromptSchema);
      const enrichedPrompt = this.characterService.enrichPromptWithCharacters(
        visual.visualPrompt,
        characters,
      );

      results.push({
        sceneNumber: scene.sceneNumber,
        visualPrompt: enrichedPrompt,
        negativePrompt: visual.negativePrompt,
        duration: scene.duration,
        cameraShot: visual.cameraShot,
        cameraMovement: visual.cameraMovement || scene.cameraMovement,
        lighting: visual.lighting || scene.lighting,
        environment: visual.environment || scene.environment,
        emotion: visual.emotion || scene.emotion,
        transition: visual.transition || scene.transition || "cut",
      });
    }

    return results;
  }
}

function sceneToTemplate(scene: SceneData): SceneTemplate {
  const extended = scene as SceneData & { sceneKey?: string };
  return {
    key: extended.sceneKey || `scene_${scene.sceneNumber}`,
    purpose: scene.caption || "scene",
    priority: 1,
    narration: scene.narration || "",
    visualDescription: scene.visualDescription,
    cameraMovement: scene.cameraMovement || "slow tracking",
    cameraAngle: scene.cameraAngle || "medium shot",
    lighting: scene.lighting || "cinematic",
    environment: scene.environment || "",
    soundEffects: scene.soundEffects || [],
    musicMood: scene.musicMood || "cinematic",
    caption: scene.caption || "",
    emotion: scene.emotion || "neutral",
    transition: scene.transition || "cut",
  };
}

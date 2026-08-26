import { createProviders } from "@/providers";
import { buildContinuityBible } from "@/lib/director/continuity";
import { detectContentType } from "@/lib/director/detect";
import { buildVisualPrompt } from "@/lib/director/visual-prompt";
import type { SceneTemplate } from "@/lib/director/types";
import { sceneVisualPrompt } from "@/lib/prompts";
import { VisualPromptSchema } from "@/lib/schemas";
import { parseAiJson } from "@/lib/utils";
import type { SceneData } from "@/lib/schemas";
import { CharacterConsistencyService } from "./character-consistency";
import { CostTrackingService } from "./cost-tracking";

export class SceneGenerationService {
  private characterService = new CharacterConsistencyService();
  private costTracker = new CostTrackingService();

  async generateVisualPrompts(
    scenes: SceneData[],
    characters: Array<{ name: string; visualToken?: string | null; visualIdentity?: string | null }>,
    visualStyle: string,
    aspectRatio: string,
    projectId?: string,
    idea?: string,
  ) {
    const providers = createProviders();

    if (providers.llm.name === "studio") {
      const contentType = idea ? detectContentType(idea) : "narrative";
      const continuity = idea ? buildContinuityBible(contentType, idea) : null;
      const useDirectorPrompts =
        continuity &&
        (contentType === "manufacturing" || contentType === "food_process");

      return scenes.map((scene) => {
        if (useDirectorPrompts) {
          const template = sceneToTemplate(scene);
          const built = buildVisualPrompt({
            scene: template,
            continuity,
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
        }

        const base = scene.visualDescription || scene.narration || "cinematic scene";
        const visualPrompt = this.characterService.enrichPromptWithCharacters(
          `cinematic photorealistic ${visualStyle.toLowerCase()}, ${base}, dramatic lighting, high detail`,
          characters,
        );
        return {
          sceneNumber: scene.sceneNumber,
          visualPrompt,
          negativePrompt:
            "text, watermark, blurry, deformed hands, duplicate face, low quality, cartoon, floating objects",
          duration: scene.duration,
          cameraShot: scene.cameraAngle || "medium shot",
          cameraMovement: scene.cameraMovement || "slow zoom in",
          lighting: scene.lighting || "dramatic cinematic",
          environment: scene.environment || "atmospheric",
          emotion: scene.emotion || "engaging",
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
  return {
    key: `scene_${scene.sceneNumber}`,
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

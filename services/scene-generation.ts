import { createProviders } from "@/providers";
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
  ) {
    const providers = createProviders();

    // Studio scripts already include visual descriptions — skip slow per-scene LLM calls
    if (providers.llm.name === "studio") {
      return scenes.map((scene) => {
        const base = scene.visualDescription || scene.narration || "cinematic scene";
        const visualPrompt = this.characterService.enrichPromptWithCharacters(
          `cinematic photorealistic ${visualStyle.toLowerCase()}, ${base}, dramatic lighting, high detail`,
          characters,
        );
        return {
          sceneNumber: scene.sceneNumber,
          visualPrompt,
          negativePrompt:
            "text, watermark, blurry, deformed hands, duplicate face, low quality, cartoon",
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

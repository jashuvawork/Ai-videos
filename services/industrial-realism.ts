import type { SceneTemplate } from "@/lib/director/types";

const INDUSTRIAL_SUFFIX =
  "industrial food-grade stainless steel surfaces, realistic factory lighting and shadows, believable machine scale, safety guards, conveyor belts, motors, sensors, realistic material physics, no futuristic machinery";

/**
 * Enriches manufacturing visual prompts with industrial realism constraints.
 */
export class IndustrialRealismService {
  enrichVisualPrompt(prompt: string, environment?: string): string {
    const envNote = environment ? `Environment: ${environment}.` : "";
    return `${prompt}. ${envNote} ${INDUSTRIAL_SUFFIX}. WHO is doing WHAT with WHICH MACHINE on WHICH MATERIAL and WHAT PHYSICAL RESULT occurs.`;
  }

  enrichNegativePrompt(base: string): string {
    return [
      base,
      "portrait showcase",
      "fashion model posing",
      "gradient title card",
      "text overlay slide",
      "woman looking at camera",
      "beauty portrait",
      "empty factory",
      "machinery turned off",
      "workers posing",
      "ingredients magically appearing",
      "teleportation",
      "cartoon",
      "CGI plastic look",
    ].join(", ");
  }

  applyToSceneTemplate(scene: SceneTemplate): SceneTemplate {
    return {
      ...scene,
      visualDescription: this.enrichVisualPrompt(scene.visualDescription, scene.environment),
    };
  }
}

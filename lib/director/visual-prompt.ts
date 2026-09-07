import type { ContinuityBible, SceneTemplate } from "./types";
import { SOCIAL_STORY_FACE_LOCK } from "@/lib/cinematic";
import {
  ABSOLUTE_NEGATIVE_PROMPT,
  HYPER_REALISM_SUFFIX,
  NO_TEXT_VISUAL_SUFFIX,
  REAL_WORLD_ACTION_SUFFIX,
} from "./no-text";
import { SIMPLE_MOTION_DIRECTIVE, NATURAL_IMPERFECTION_DIRECTIVE } from "./capture-medium";

export function buildVisualPrompt(params: {
  scene: SceneTemplate;
  continuity: ContinuityBible;
  visualStyle: string;
  aspectRatio?: string;
  characters?: Array<{ name: string; visualToken?: string | null; visualIdentity?: string | null }>;
}): {
  visualPrompt: string;
  negativePrompt: string;
  cameraShot: string;
  cameraMovement: string;
  lighting: string;
  environment: string;
  emotion: string;
} {
  const { scene, continuity, aspectRatio, characters } = params;
  const isProcess =
    continuity.contentType === "manufacturing" || continuity.contentType === "food_process";

  const continuityParts = isProcess
    ? [
        continuity.productReference,
        continuity.phoneIdentity,
        continuity.factoryIdentity,
        continuity.environmentVisual,
        continuity.machineVisual,
      ]
    : [
        continuity.characterIdentity,
        continuity.characterVisual,
        continuity.environmentVisual || continuity.factoryIdentity,
      ];
  if (
    isProcess &&
    continuity.characterIdentity &&
    scene.visualDescription.match(/worker|engineer|technician|factory|assembly|hands|gloved/i)
  ) {
    continuityParts.push(continuity.characterIdentity);
  }
  if (continuity.characterVisual && characters?.length) {
    const charTokens = characters
      .map((c) => c.visualToken || c.visualIdentity)
      .filter(Boolean)
      .join(", ");
    if (charTokens) continuityParts.push(charTokens);
  }

  const aspectNote =
    aspectRatio?.includes("9:16") || aspectRatio?.includes("9_16")
      ? "vertical 9:16 framing, action centered in safe area, no text fillers"
      : aspectRatio?.includes("16:9") || aspectRatio?.includes("16_9")
        ? "landscape 16:9 widescreen documentary framing"
        : "";

  const visualPrompt = [
    scene.visualDescription,
    `Environment: ${scene.environment}`,
    continuityParts.join(". "),
    `viewpoint: ${scene.cameraAngle}, ${scene.cameraMovement}`,
    `Lighting: ${scene.lighting}`,
    continuity.captureMedium,
    continuity.lensCharacter,
    isProcess ? SIMPLE_MOTION_DIRECTIVE : "one clear action happening now",
    isProcess ? REAL_WORLD_ACTION_SUFFIX : SOCIAL_STORY_FACE_LOCK,
    isProcess ? NATURAL_IMPERFECTION_DIRECTIVE : "",
    NO_TEXT_VISUAL_SUFFIX,
    isProcess ? HYPER_REALISM_SUFFIX : "photoreal live-action, natural daylight colors, real people and places, not a slideshow",
    aspectNote,
  ]
    .filter(Boolean)
    .join(". ");

  return {
    visualPrompt,
    negativePrompt: `${continuity.negativePromptBase}, ${ABSOLUTE_NEGATIVE_PROMPT}`,
    cameraShot: scene.cameraAngle,
    cameraMovement: scene.cameraMovement,
    lighting: scene.lighting,
    environment: scene.environment,
    emotion: scene.emotion,
  };
}

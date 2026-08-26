import type { ContinuityBible, SceneTemplate } from "./types";
import { ABSOLUTE_NEGATIVE_PROMPT, NO_TEXT_VISUAL_SUFFIX, REAL_WORLD_ACTION_SUFFIX } from "./no-text";

const STYLE_DESCRIPTORS: Record<string, string> = {
  CINEMATIC:
    "photorealistic industrial documentary footage, professionally filmed real factory, subtle 35mm grain, natural motion blur",
  PHOTOREALISTIC: "photorealistic, ultra detailed textures, natural reflections, real-world footage quality",
  REALISTIC: "realistic, natural lighting, physically accurate motion",
  ANIMATED: "stylized animation, vibrant colors",
};

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
  const { scene, continuity, visualStyle, aspectRatio, characters } = params;
  const styleKey = visualStyle.toUpperCase();
  const styleDesc = STYLE_DESCRIPTORS[styleKey] || STYLE_DESCRIPTORS.CINEMATIC;

  const continuityParts = [
    continuity.productVisual,
    continuity.environmentVisual,
    continuity.machineVisual,
  ];
  if (continuity.workerVisual && scene.visualDescription.match(/worker|engineer|technician|factory|assembly|hands|gloved/i)) {
    continuityParts.push(continuity.workerVisual);
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
      ? "vertical 9:16 framing, manufacturing action centered in mobile safe area, no text to fill frame"
      : aspectRatio?.includes("16:9") || aspectRatio?.includes("16_9")
        ? "landscape 16:9 widescreen documentary framing"
        : "";

  const visualPrompt = [
    styleDesc,
    scene.visualDescription,
    `Environment: ${scene.environment}`,
    continuityParts.join(". "),
    `Camera: ${scene.cameraAngle}, ${scene.cameraMovement}`,
    `Lighting: ${scene.lighting}`,
    REAL_WORLD_ACTION_SUFFIX,
    NO_TEXT_VISUAL_SUFFIX,
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

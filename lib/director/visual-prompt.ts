import type { ContinuityBible, SceneTemplate } from "./types";

const STYLE_DESCRIPTORS: Record<string, string> = {
  CINEMATIC: "high-end cinematic documentary, photorealistic, 35mm film grain subtle",
  PHOTOREALISTIC: "photorealistic, ultra detailed textures, natural reflections",
  REALISTIC: "realistic, natural lighting, physically accurate",
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
  if (continuity.workerVisual && scene.visualDescription.match(/worker|engineer|factory|assembly/i)) {
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
      ? "vertical 9:16 framing, subject centered in mobile safe area"
      : aspectRatio?.includes("16:9") || aspectRatio?.includes("16_9")
        ? "landscape 16:9 widescreen framing"
        : "";

  const visualPrompt = [
    styleDesc,
    scene.visualDescription,
    `Environment: ${scene.environment}`,
    continuityParts.join(". "),
    `Camera: ${scene.cameraAngle}, ${scene.cameraMovement}`,
    `Lighting: ${scene.lighting}`,
    `Mood: ${scene.emotion}`,
    aspectNote,
    "physically accurate manufacturing, realistic materials, natural shadows, no floating objects",
  ]
    .filter(Boolean)
    .join(". ");

  return {
    visualPrompt,
    negativePrompt: continuity.negativePromptBase,
    cameraShot: scene.cameraAngle,
    cameraMovement: scene.cameraMovement,
    lighting: scene.lighting,
    environment: scene.environment,
    emotion: scene.emotion,
  };
}

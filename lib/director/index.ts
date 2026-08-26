import { distributeDurations } from "@/lib/utils";
import { buildContinuityBible } from "./continuity";
import { detectContentType, isVerticalPlatform } from "./detect";
import { calculateSceneCount } from "./scene-count";
import { FOOD_PROCESS_SCENES } from "./templates/food";
import { MANUFACTURING_SCENES } from "./templates/manufacturing";
import { buildNarrativeScenes } from "./templates/narrative";
import type { DirectorInput, DirectorStory, SceneTemplate } from "./types";

export function selectScenesForDuration(
  templates: SceneTemplate[],
  sceneCount: number,
): SceneTemplate[] {
  if (sceneCount >= templates.length) {
    // Expand by repeating lower-priority scenes with variation context
    const sorted = [...templates].sort((a, b) => a.priority - b.priority);
    const result: SceneTemplate[] = [];
    let i = 0;
    while (result.length < sceneCount) {
      result.push(sorted[i % sorted.length]);
      i++;
    }
    return result.slice(0, sceneCount);
  }

  const sorted = [...templates].sort((a, b) => a.priority - b.priority);
  const essential = sorted.filter((s) => s.priority === 1);
  const secondary = sorted.filter((s) => s.priority === 2);
  const optional = sorted.filter((s) => s.priority >= 3);

  const picked: SceneTemplate[] = [];
  for (const scene of essential) {
    if (picked.length < sceneCount) picked.push(scene);
  }
  for (const scene of secondary) {
    if (picked.length < sceneCount) picked.push(scene);
  }
  for (const scene of optional) {
    if (picked.length < sceneCount) picked.push(scene);
  }

  // Restore chronological order by original template index
  const orderMap = new Map(templates.map((t, idx) => [t.key, idx]));
  return picked
    .sort((a, b) => (orderMap.get(a.key) ?? 0) - (orderMap.get(b.key) ?? 0))
    .slice(0, sceneCount);
}

function getTemplatesForType(contentType: string, idea: string): SceneTemplate[] {
  switch (contentType) {
    case "manufacturing":
      return MANUFACTURING_SCENES;
    case "food_process":
      return FOOD_PROCESS_SCENES;
    default:
      return buildNarrativeScenes(idea);
  }
}

function buildTitle(contentType: string, idea: string, continuity: ReturnType<typeof buildContinuityBible>): string {
  if (contentType === "manufacturing") {
    return `How the ${continuity.productName ?? "Smartphone"} Is Made`;
  }
  if (contentType === "food_process") {
    const subject = continuity.productName ?? "Food";
    return `How ${subject.charAt(0).toUpperCase() + subject.slice(1)} Is Made`;
  }
  const words = idea.split(/\s+/).slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function buildHook(contentType: string, idea: string, vertical: boolean): string {
  if (contentType === "manufacturing") {
    return vertical
      ? "Ever wondered how your smartphone is actually built? Watch the full factory journey."
      : "Inside the factory: from raw components to finished smartphone.";
  }
  if (contentType === "food_process") {
    return "From raw ingredients to the finished product — see how it's really made.";
  }
  return `Nobody expected what happened when ${idea.split(/[.!?]/)[0].trim()}…`;
}

function buildSummary(contentType: string, idea: string): string {
  if (contentType === "manufacturing") {
    return `A realistic cinematic documentary showing the complete journey of smartphone manufacturing: ${idea}. From raw materials through component production, PCB assembly, display and battery installation, final assembly, quality control, packaging, and finished product presentation.`;
  }
  if (contentType === "food_process") {
    return `A documentary journey showing how ${idea.split(/[.!?]/)[0]} is produced from source ingredients through processing, refining, packaging, and final presentation.`;
  }
  return `A cinematic short film about: ${idea}`;
}

function buildCharacters(contentType: string, continuity: ReturnType<typeof buildContinuityBible>) {
  if (contentType === "manufacturing" || contentType === "food_process") {
    return [
      {
        name: "Lead Engineer",
        age: 32,
        gender: "female",
        appearance: continuity.workerVisual,
        hair: "dark hair tied back under helmet",
        clothing: "navy blue factory uniform, white safety helmet, clear safety glasses",
        bodyType: "average athletic",
        facialFeatures: "focused expression, natural realistic face",
        personality: "professional and meticulous",
        visualIdentity: continuity.workerVisual,
        visualToken: "navy uniform, white helmet, safety glasses",
      },
    ];
  }
  return [
    {
      name: "Protagonist",
      age: 25,
      gender: "neutral",
      appearance: continuity.characterVisual ?? "distinctive cinematic presence",
      hair: "dark hair",
      clothing: "consistent wardrobe across all scenes",
      bodyType: "average",
      facialFeatures: "expressive eyes, natural face",
      personality: "determined",
      visualIdentity: continuity.characterVisual ?? "protagonist, consistent appearance",
      visualToken: "same protagonist throughout",
    },
  ];
}

function shouldIncludeNarration(input: DirectorInput, contentType: string): boolean {
  const voice = input.voice?.toUpperCase();
  if (voice === "NONE") return false;
  // Process documentaries default to environmental sound unless voice explicitly chosen
  if (contentType === "manufacturing" || contentType === "food_process") {
    return Boolean(voice && voice !== "NONE");
  }
  return true;
}

function sceneCaption(contentType: string): string {
  // Never use on-screen chapter labels — story is told through visuals
  if (contentType === "manufacturing" || contentType === "food_process") return "";
  return "";
}

export function generateDirectorStory(input: DirectorInput): DirectorStory {
  const contentType = detectContentType(input.idea);
  const continuity = buildContinuityBible(contentType, input.idea);
  const templates = getTemplatesForType(contentType, input.idea);
  const sceneCount = calculateSceneCount(input.duration, input.generationMode);
  const selected = selectScenesForDuration(templates, sceneCount);
  const durations = distributeDurations(input.duration, selected.length);
  const vertical = isVerticalPlatform(input.platform);
  const includeNarration = shouldIncludeNarration(input, contentType);
  const tone =
    contentType === "manufacturing" || contentType === "food_process"
      ? "industrial documentary"
      : input.tone || "cinematic";

  const scenes = selected.map((template, i) => ({
    sceneNumber: i + 1,
    duration: durations[i],
    narration: includeNarration ? template.narration : "",
    dialogue: "",
    visualDescription: injectContinuity(template.visualDescription, continuity),
    cameraMovement: template.cameraMovement,
    cameraAngle: template.cameraAngle,
    lighting: template.lighting,
    environment: template.environment,
    soundEffects: template.soundEffects,
    musicMood: template.musicMood,
    caption: sceneCaption(contentType),
    transition: i === selected.length - 1 ? "fade" : template.transition,
    emotion: template.emotion,
    sceneKey: template.key,
  }));

  return {
    title: buildTitle(contentType, input.idea, continuity),
    hook: buildHook(contentType, input.idea, vertical),
    summary: buildSummary(contentType, input.idea),
    duration: input.duration,
    tone,
    characters: buildCharacters(contentType, continuity),
    scenes,
    continuity,
  };
}

function injectContinuity(visual: string, continuity: ReturnType<typeof buildContinuityBible>): string {
  if (continuity.contentType === "manufacturing") {
    return `${visual}. Same NovaTech X9 phone throughout: midnight blue frame, triple vertical cameras, 6.7 inch display. Same factory. Active machines and workers. No readable text on devices, boxes, or signs.`;
  }
  return visual;
}

export const DIRECTOR_SYSTEM_PROMPT = `You are an expert filmmaker and AI video production director.

MOST IMPORTANT: NEVER create title cards, text slides, chapter labels, or captions on screen. The story must be told through VISUAL ACTION only.

For manufacturing / factory ideas:
- Show actual raw materials, machinery, workers, robotic arms, conveyors, and operations — NOT words like "RAW MATERIALS" on a blank background
- Every scene must have meaningful physical activity; machines operating, hands handling parts, conveyors moving
- Chronological production pipeline with strict product continuity (same phone model, factory, workers)
- Photorealistic footage that looks like a real factory was filmed

NO TEXT BY DEFAULT: no titles, labels, captions, subtitles, logos, watermarks, or readable UI in generated visuals.
Narration is optional voice-over only — never put narration text on screen.
If voice is not requested, leave narration empty and rely on environmental factory sounds.

Scene count by duration: 30s→8-10, 60s→12-15, 120s→18-25, 300s+→30+ scenes.
Each scene: detailed action-focused visualDescription, camera, lighting, environment. caption field must be empty string.

Always return valid JSON matching the requested schema.`;

import { distributeDurations } from "@/lib/utils";
import { buildContinuityBible } from "./continuity";
import { detectContentType, isVerticalPlatform, resolveContentType } from "./detect";
import { calculateSceneCount } from "./scene-count";
import { FOOD_PROCESS_SCENES } from "./templates/food";
import { MANUFACTURING_SCENES } from "./templates/manufacturing";
import { buildNarrativeScenes } from "./templates/narrative";
import { ProcessContinuityService } from "@/services/process-continuity";
import type { DirectorInput, DirectorStory, SceneTemplate } from "./types";

const processContinuity = new ProcessContinuityService();

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
  const ordered = picked
    .sort((a, b) => (orderMap.get(a.key) ?? 0) - (orderMap.get(b.key) ?? 0))
    .slice(0, sceneCount);

  // Always end on finale shot when trimming (hero / outbound)
  if (sceneCount < templates.length && ordered.length > 0) {
    const finale = templates[templates.length - 1];
    if (!ordered.some((s) => s.key === finale.key)) {
      ordered[ordered.length - 1] = finale;
    }
  }

  return ordered;
}

function getTemplatesForType(contentType: string, idea: string, videoType?: string): SceneTemplate[] {
  const processTemplates = processContinuity.getTemplatesForIdea(idea);
  if (processTemplates) return processTemplates;

  switch (contentType) {
    case "manufacturing":
      return MANUFACTURING_SCENES;
    case "food_process":
      return FOOD_PROCESS_SCENES;
    default:
      if (videoType === "MANUFACTURING") {
        return processContinuity.toSceneTemplates(processContinuity.buildChain(idea));
      }
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
    return vertical
      ? "From raw ingredients to the finished product — see how it's really made."
      : "Inside the factory: every step of real-world food production.";
  }
  return `Nobody expected what happened when ${idea.split(/[.!?]/)[0].trim()}…`;
}

function buildSummary(contentType: string, idea: string): string {
  if (contentType === "manufacturing") {
    return `A realistic cinematic documentary showing the complete journey of smartphone manufacturing: ${idea}. From raw materials through component production, PCB assembly, display and battery installation, final assembly, quality control, packaging, and finished product presentation.`;
  }
  if (contentType === "food_process") {
    return `A documentary journey showing how ${idea.split(/[.!?]/)[0]} is produced — raw material receiving through ingredient prep, mixing, forming, baking or processing, cooling, quality inspection, packaging, and finished product outbound.`;
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
  const contentType = resolveContentType(input.idea, input.videoType);
  const continuity = buildContinuityBible(contentType, input.idea);
  const templates = getTemplatesForType(contentType, input.idea, input.videoType);
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
    return `${visual}. ${continuity.productReference ?? ""}. Same fictional NovaTech X9 throughout. Cause-effect physical steps visible. No readable text. Hyper-realistic documentary footage.`;
  }
  if (continuity.contentType === "food_process") {
    return `${visual}. ${continuity.productReference ?? ""}. Continuous production process with visible cause-effect steps. No readable text. Hyper-realistic documentary footage.`;
  }
  return visual;
}

export const DIRECTOR_SYSTEM_PROMPT = `You are an expert cinematic filmmaker, documentary director, cinematographer, and hyper-realistic AI video director.

FINAL STANDARD: footage must look like a professional documentary crew filmed inside a real location — NOT an AI slideshow, presentation, title cards, or generic stock montage.

HYPER-REALISM RULES:
1. Define HOW footage is captured: professional documentary camera, controlled movement, natural color grading, subtle film grain
2. SIMPLE MOTION per shot: one or two subjects, one or two simple actions, minimal camera movement (static or slow tracking)
3. SHOW actual physical events with believable cause and effect — never title cards or chapter labels on screen
4. ZERO unrequested visible text in generated visuals
5. CONTINUITY ENGINE: maintain PHONE_IDENTITY, FACTORY_IDENTITY, CHARACTER_IDENTITY across every scene
6. NATURAL IMPERFECTION: subtle scratches, cables, vibration, realistic depth of field — not sterile CGI
7. MACHINES: approach, grip, lift, place, release — no teleportation or skipped physics
8. HUMANS: correct hands, looking at work not camera, natural worker behavior

Manufacturing: fictional but realistic NovaTech X9 plant — full pipeline from receiving through machining, SMT, assembly, testing, cleaning, packaging.
Narration optional voice-over only when voice requested; caption field always empty string.

Scene count: 30s→8-10, 60s→12-15, 120s→18-25, 300s+→30+.
Each visualDescription must describe LOCATION, SUBJECT, ACTION, PHYSICAL INTERACTION, and what happens next.

Always return valid JSON matching the requested schema.`;

export { validateSceneDescription } from "./no-text";
export { buildContinuityIdentities } from "./continuity-engine";
export { captureMediumForContent } from "./capture-medium";

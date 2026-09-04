import { z } from "zod";

export const StoryDialogueLineSchema = z.object({
  character: z.string(),
  text: z.string(),
  emotion: z.string().optional(),
});

export const StorySceneSchema = z.object({
  sceneId: z.string(),
  startTime: z.number().nonnegative(),
  duration: z.number().positive(),
  purpose: z.string(),
  narration: z.string().optional(),
  dialogue: z.array(StoryDialogueLineSchema).default([]),
  emotion: z.string(),
  location: z.string(),
  timeOfDay: z.string(),
  weather: z.string().optional(),
  visualDescription: z.string(),
  camera: z.string(),
  gameplaySearchTerms: z.array(z.string()).default([]),
  aiVideoRequired: z.boolean().default(false),
  aiVideoPrompt: z.string().optional(),
  imageRequired: z.boolean().default(false),
  musicMood: z.string().optional(),
  soundEffects: z.array(z.string()).default([]),
  transition: z.string().default("cut"),
  voiceDirection: z
    .object({
      emotion: z.string().optional(),
      pace: z.string().optional(),
      intensity: z.number().min(0).max(1).optional(),
      pauseAfter: z.number().optional(),
    })
    .optional(),
});

export const StoryCharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  ageRange: z.string().optional(),
  personality: z.string().optional(),
  role: z.string(),
  clothing: z.string().optional(),
  appearance: z.string().optional(),
  voice: z.string().optional(),
  accent: z.string().optional(),
  elevenLabsVoiceId: z.string().optional(),
});

export const StoryBeatSchema = z.object({
  id: z.string(),
  label: z.string(),
  startPercent: z.number(),
  endPercent: z.number(),
  summary: z.string(),
});

export const StoryPlanSchema = z.object({
  title: z.string(),
  logline: z.string(),
  genre: z.string(),
  tone: z.string(),
  targetDurationSeconds: z.number().positive(),
  visualStyle: z.string(),
  characters: z.array(StoryCharacterSchema),
  locations: z.array(z.string()),
  storyBeats: z.array(StoryBeatSchema),
  scenes: z.array(StorySceneSchema).min(1),
  visualBible: z
    .object({
      colorFeel: z.string().optional(),
      cameraLanguage: z.string().optional(),
      lighting: z.string().optional(),
      cinematicStyle: z.string().optional(),
    })
    .optional(),
});

export const CreateStoryProjectSchema = z.object({
  idea: z.string().min(10).max(5000),
  genre: z.string().default("Crime Thriller"),
  durationMinutes: z.coerce.number().min(1).max(30).default(8),
  visualStyle: z.string().default("Cinematic GTA"),
  narrationStyle: z.string().default("Deep cinematic male"),
  language: z.string().default("en"),
  targetAudience: z.string().default("YouTube 18-34"),
  gameplaySource: z.string().default("User upload"),
  voice: z.enum(["MALE", "FEMALE", "NEUTRAL"]).default("MALE"),
  musicStyle: z.string().default("Suspense"),
  pacing: z.enum(["slow", "medium", "fast"]).default("fast"),
  assetRights: z.enum(["OWNED", "LICENSED", "PUBLIC_DOMAIN", "OTHER_PERMISSION"]).default("OWNED"),
  advanced: z
    .object({
      maxAiVideoShots: z.number().min(0).max(50).default(12),
      maxBudgetUsd: z.number().min(0).default(25),
      gameplayPercent: z.number().min(0).max(100).default(70),
      aiVisualPercent: z.number().min(0).max(100).default(30),
      subtitleStyle: z.string().default("CINEMATIC"),
      qcThreshold: z.number().min(0).max(10).default(8),
      shortsCount: z.number().min(0).max(10).default(5),
    })
    .optional(),
});

export type StoryPlan = z.infer<typeof StoryPlanSchema>;
export type StoryScene = z.infer<typeof StorySceneSchema>;
export type CreateStoryProjectInput = z.infer<typeof CreateStoryProjectSchema>;

const PACING_VALUES = ["slow", "medium", "fast"] as const;
const VOICE_VALUES = ["MALE", "FEMALE", "NEUTRAL"] as const;

export function normalizePacing(value: unknown): (typeof PACING_VALUES)[number] {
  const raw = String(value ?? "fast").toLowerCase().trim();
  return PACING_VALUES.includes(raw as (typeof PACING_VALUES)[number])
    ? (raw as (typeof PACING_VALUES)[number])
    : "fast";
}

export function normalizeVoice(value: unknown): (typeof VOICE_VALUES)[number] {
  const raw = String(value ?? "MALE").toUpperCase().trim();
  return VOICE_VALUES.includes(raw as (typeof VOICE_VALUES)[number])
    ? (raw as (typeof VOICE_VALUES)[number])
    : "MALE";
}

export function pickStudioAdvancedSettings(raw: unknown) {
  if (!raw || typeof raw !== "object") return undefined;
  const s = raw as Record<string, unknown>;
  return {
    maxAiVideoShots: Number(s.maxAiVideoShots) || 12,
    maxBudgetUsd: Number(s.maxBudgetUsd) || 25,
    gameplayPercent: Number(s.gameplayPercent) || 70,
    aiVisualPercent: Number(s.aiVisualPercent) || 30,
    subtitleStyle: typeof s.subtitleStyle === "string" ? s.subtitleStyle : "CINEMATIC",
    qcThreshold: Number(s.qcThreshold) || 8,
    shortsCount: Number(s.shortsCount) || 5,
  };
}

export function formatZodError(error: unknown): string {
  if (error && typeof error === "object" && "issues" in error) {
    const issues = (error as { issues: Array<{ message: string; path: Array<string | number> }> }).issues;
    if (issues.length > 0) {
      return issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ");
    }
  }
  return error instanceof Error ? error.message : "Validation failed";
}

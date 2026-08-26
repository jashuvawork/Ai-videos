import { z } from "zod";

export const SceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  duration: z.number().positive(),
  narration: z.string().optional().default(""),
  dialogue: z.string().optional().default(""),
  visualDescription: z.string(),
  cameraMovement: z.string().optional().default("slow zoom in"),
  cameraAngle: z.string().optional().default("medium shot"),
  lighting: z.string().optional().default("natural"),
  environment: z.string().optional().default(""),
  soundEffects: z.array(z.string()).optional().default([]),
  musicMood: z.string().optional().default("cinematic"),
  caption: z.string().optional().default(""),
  transition: z.string().optional().default("cut"),
  emotion: z.string().optional().default("neutral"),
  sceneKey: z.string().optional(),
});

export const CharacterSchema = z.object({
  name: z.string(),
  age: z.number().optional(),
  gender: z.string().optional(),
  appearance: z.string().optional(),
  hair: z.string().optional(),
  clothing: z.string().optional(),
  bodyType: z.string().optional(),
  facialFeatures: z.string().optional(),
  personality: z.string().optional(),
  visualIdentity: z.string().optional(),
});

export const StorySchema = z.object({
  title: z.string(),
  hook: z.string(),
  summary: z.string(),
  duration: z.number().positive(),
  tone: z.string(),
  characters: z.array(CharacterSchema).default([]),
  scenes: z.array(SceneSchema).min(1),
});

export const VisualPromptSchema = z.object({
  sceneNumber: z.number().optional(),
  visualPrompt: z.string(),
  negativePrompt: z.string().optional().default(""),
  duration: z.number().optional(),
  cameraShot: z.string().optional(),
  cameraMovement: z.string().optional(),
  lighting: z.string().optional(),
  environment: z.string().optional(),
  characterPositioning: z.string().optional(),
  emotion: z.string().optional(),
  transition: z.string().optional(),
});

export const SocialMetadataSchema = z.object({
  youtubeTitle: z.string(),
  youtubeDescription: z.string(),
  youtubeHashtags: z.string(),
  instagramCaption: z.string(),
  instagramHashtags: z.string(),
  tiktokCaption: z.string(),
  tiktokHashtags: z.string(),
});

export const CreateProjectSchema = z.object({
  idea: z.string().min(3).max(5000),
  videoType: z.string().optional(),
  platform: z.string().optional(),
  aspectRatio: z.string().optional(),
  duration: z.number().int().min(5).max(600).optional(),
  visualStyle: z.string().optional(),
  voice: z.string().optional(),
  language: z.string().optional(),
  generationMode: z.enum(["FAST", "CINEMATIC"]).optional(),
  visualGenerationMode: z.enum(["IMAGES", "AI_VIDEO", "AUTOMATIC"]).optional(),
  magicGenerate: z.boolean().optional(),
});

export const RegenerateSceneSchema = z.object({
  alternatives: z.number().int().min(1).max(3).optional().default(1),
});

export const EditScriptSchema = z.object({
  scenes: z.array(SceneSchema).optional(),
  title: z.string().optional(),
  hook: z.string().optional(),
  summary: z.string().optional(),
});

export const AiEditSchema = z.object({
  instruction: z.string().min(3).max(2000),
});

export type Story = z.infer<typeof StorySchema>;
export type SceneData = z.infer<typeof SceneSchema>;
export type CharacterData = z.infer<typeof CharacterSchema>;

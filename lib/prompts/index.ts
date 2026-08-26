import { calculateSceneCount } from "@/lib/director/scene-count";

export const storyPrompt = (params: {
  idea: string;
  videoType: string;
  duration: number;
  language: string;
  tone: string;
  platform: string;
  visualStyle: string;
  generationMode: string;
  voice?: string;
}) => {
  const targetScenes = calculateSceneCount(params.duration, params.generationMode);
  const voiceLine = params.voice ? `- Voice: ${params.voice}` : "- Voice: NONE";
  return `
You are an expert filmmaker and AI video production director.

MOST IMPORTANT: NEVER create title cards, text slides, or chapter labels on screen. Tell the story through VISUAL ACTION.
Show real factory action — machines operating, workers handling parts, conveyors moving — NOT words like "RAW MATERIALS" on a blank background.
NO visible text in generated scenes: no titles, labels, captions, subtitles, logos, or readable signs unless explicitly requested.
Narration is optional voice-over only (never on-screen text). Leave narration empty if Voice is NONE.

INPUT:
- Idea: ${params.idea}
- Video Type: ${params.videoType}
- Target Duration: ${params.duration} seconds (scene durations MUST sum to exactly ${params.duration})
- Language: ${params.language}
- Tone: ${params.tone}
- Platform: ${params.platform}
- Visual Style: ${params.visualStyle}
- Mode: ${params.generationMode}
${voiceLine}

IF MANUFACTURING / FACTORY: chronological production with strict product continuity. Every scene has active physical motion.
IF FOOD / PROCESS: source → prep → processing → packaging with continuous action.
IF NARRATIVE: hook → character action → discovery → escalation → climax → resolution.

SCENE COUNT: ~${targetScenes} scenes. Each scene 3-6 seconds. caption field MUST be empty string "".
visualDescription must describe what is physically happening on screen.

Return ONLY valid JSON matching this schema:
{
  "title": "string",
  "hook": "string",
  "summary": "string",
  "duration": ${params.duration},
  "tone": "string",
  "characters": [{ "name", "age", "gender", "appearance", "hair", "clothing", "bodyType", "facialFeatures", "personality", "visualIdentity" }],
  "scenes": [{
    "sceneNumber": 1,
    "duration": number,
    "narration": "string",
    "dialogue": "string",
    "visualDescription": "string",
    "cameraMovement": "string",
    "cameraAngle": "string",
    "lighting": "string",
    "environment": "string",
    "soundEffects": ["string"],
    "musicMood": "string",
    "caption": "string",
    "transition": "cut|fade|cross_dissolve",
    "emotion": "string"
  }]
}
`;
};

export const sceneVisualPrompt = (params: {
  scene: {
    visualDescription: string;
    cameraMovement?: string;
    cameraAngle?: string;
    lighting?: string;
    environment?: string;
    emotion?: string;
  };
  characters: Array<{ name: string; visualToken?: string; visualIdentity?: string }>;
  visualStyle: string;
  aspectRatio: string;
}) => `
Generate a detailed image/video prompt for this scene.

Visual Style: ${params.visualStyle}
Aspect Ratio: ${params.aspectRatio}
Scene: ${params.scene.visualDescription}
Camera: ${params.scene.cameraAngle || "medium shot"}, ${params.scene.cameraMovement || "slow zoom"}
Lighting: ${params.scene.lighting || "cinematic"}
Environment: ${params.scene.environment || ""}
Emotion: ${params.scene.emotion || "neutral"}

Characters in scene:
${params.characters.map((c) => `- ${c.name}: ${c.visualToken || c.visualIdentity || ""}`).join("\n")}

Return ONLY valid JSON:
{
  "visualPrompt": "detailed prompt string",
  "negativePrompt": "things to avoid",
  "cameraShot": "string",
  "cameraMovement": "string",
  "lighting": "string",
  "environment": "string",
  "characterPositioning": "string",
  "emotion": "string",
  "transition": "cut|fade|cross_dissolve"
}
`;

export const characterBiblePrompt = (character: {
  name: string;
  description?: string;
}) => `
Create a character visual bible for consistent AI image generation.

Name: ${character.name}
Description: ${character.description || character.name}

Return ONLY valid JSON:
{
  "name": "string",
  "age": number,
  "gender": "string",
  "appearance": "string",
  "hair": "string",
  "clothing": "string",
  "bodyType": "string",
  "facialFeatures": "string",
  "personality": "string",
  "visualIdentity": "single line visual description for prompts",
  "visualToken": "compact token for prompt injection"
}
`;

export const metadataPrompt = (params: {
  title: string;
  summary: string;
  hook: string;
  platform: string;
  duration: number;
}) => `
Generate social media metadata for this video.

Title: ${params.title}
Summary: ${params.summary}
Hook: ${params.hook}
Platform: ${params.platform}
Duration: ${params.duration}s

Return ONLY valid JSON:
{
  "youtubeTitle": "string (max 70 chars)",
  "youtubeDescription": "string",
  "youtubeHashtags": "string (5-8 hashtags)",
  "instagramCaption": "string",
  "instagramHashtags": "string (5-8 hashtags)",
  "tiktokCaption": "string",
  "tiktokHashtags": "string (5-8 hashtags)"
}
`;

export const aiEditPrompt = (params: {
  instruction: string;
  currentScript: unknown;
}) => `
Modify this video script based on the user's instruction. Only change what is necessary.

Instruction: ${params.instruction}

Current script:
${JSON.stringify(params.currentScript, null, 2)}

Return the FULL updated script JSON with the same schema as the input.
Maintain total duration unless explicitly asked to change it.
`;

export const contentSafetyPrompt = (text: string) => `
Analyze this content for safety issues. Return JSON:
{ "safe": boolean, "issues": ["string"], "suggestion": "string" }

Content: ${text}
`;

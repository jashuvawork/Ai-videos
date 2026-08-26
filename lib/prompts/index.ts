export const storyPrompt = (params: {
  idea: string;
  videoType: string;
  duration: number;
  language: string;
  tone: string;
  platform: string;
  visualStyle: string;
  generationMode: string;
}) => `
You are an expert short-form video storyteller. Create a compelling video script as structured JSON.

INPUT:
- Idea: ${params.idea}
- Video Type: ${params.videoType}
- Target Duration: ${params.duration} seconds (MUST match exactly in scene durations)
- Language: ${params.language}
- Tone: ${params.tone}
- Platform: ${params.platform}
- Visual Style: ${params.visualStyle}
- Mode: ${params.generationMode}

REQUIREMENTS:
1. Strong hook in first 1-3 seconds
2. Emotional progression with clear beginning, escalation, payoff
3. Scene durations MUST sum to exactly ${params.duration} seconds
4. For ${params.duration}s video, use ${Math.max(3, Math.min(12, Math.ceil(params.duration / 5)))} scenes
5. Optimize for retention on ${params.platform}
6. Narration in ${params.language}

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

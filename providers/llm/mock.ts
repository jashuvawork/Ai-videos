import { distributeDurations } from "@/lib/utils";
import type { LLMProvider, LLMGenerateOptions, LLMResponse } from "./types";

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    const idea = extractIdea(options.prompt);
    const duration = extractDuration(options.prompt) || 30;
    const mode = extractGenerationMode(options.prompt);
    const secondsPerScene = mode === "CINEMATIC" ? 5 : 8;
    const maxScenes = mode === "CINEMATIC" ? 8 : 4;
    const sceneCount = Math.max(3, Math.min(maxScenes, Math.ceil(duration / secondsPerScene)));
    const durations = distributeDurations(duration, sceneCount);

    const story = {
      title: generateTitle(idea),
      hook: generateHook(idea),
      summary: `A cinematic short about: ${idea}`,
      duration,
      tone: "cinematic",
      characters: extractCharacters(idea),
      scenes: durations.map((d, i) => ({
        sceneNumber: i + 1,
        duration: d,
        narration: generateNarration(idea, i, sceneCount),
        dialogue: "",
        visualDescription: generateVisual(idea, i, sceneCount),
        cameraMovement: pickCamera(i),
        cameraAngle: i === 0 ? "wide shot" : "medium shot",
        lighting: i < sceneCount / 2 ? "moody low light" : "dramatic backlight",
        environment: generateEnvironment(idea, i),
        soundEffects: pickSfx(i),
        musicMood: i < sceneCount - 1 ? "suspense" : "emotional",
        caption: generateNarration(idea, i, sceneCount).slice(0, 80),
        transition: i === sceneCount - 1 ? "fade" : "cut",
        emotion: pickEmotion(i, sceneCount),
      })),
    };

    if (options.prompt.includes("social media metadata")) {
      const meta = {
        youtubeTitle: story.title,
        youtubeDescription: `${story.summary}\n\nCreated with AI Video Studio.`,
        youtubeHashtags: "#shortfilm #story #aivideo #cinematic #viral",
        instagramCaption: `${story.hook}\n\n${story.summary}`,
        instagramHashtags: "#reels #storytime #aivideo #cinematic #viral",
        tiktokCaption: `${story.hook} 👀`,
        tiktokHashtags: "#fyp #story #aivideo #cinematic #viral",
      };
      return { text: JSON.stringify(meta), provider: this.name, cost: 0.001 };
    }

    if (options.prompt.includes("character visual bible")) {
      const name = extractName(options.prompt) || "Alex";
      const char = {
        name,
        age: 25,
        gender: "male",
        appearance: "athletic build, determined expression",
        hair: "dark hair, slightly messy",
        clothing: "navy jacket, practical boots",
        bodyType: "athletic",
        facialFeatures: "sharp jawline, expressive eyes",
        personality: "curious and resilient",
        visualIdentity: `${name}, 25-year-old with dark hair, navy jacket, determined expression`,
        visualToken: `${name}: dark hair, navy jacket, athletic`,
      };
      return { text: JSON.stringify(char), provider: this.name, cost: 0.001 };
    }

    if (options.prompt.includes("image/video prompt") || options.prompt.includes("detailed image/video prompt")) {
      const visual = {
        visualPrompt: "cinematic photorealistic shot, " + idea + ", dramatic lighting, high detail, 35mm lens",
        negativePrompt: "deformed hands, duplicate person, extra limbs, text, watermark, distorted face, low resolution",
        cameraShot: "medium shot",
        cameraMovement: "slow zoom in",
        lighting: "dramatic cinematic",
        environment: "atmospheric",
        characterPositioning: "center frame",
        emotion: "tense",
        transition: "cut",
      };
      return { text: JSON.stringify(visual), provider: this.name, cost: 0.001 };
    }

    return {
      text: JSON.stringify(story),
      provider: this.name,
      usage: { inputTokens: 100, outputTokens: 500 },
      cost: 0.01,
    };
  }
}

function extractIdea(prompt: string): string {
  const match = prompt.match(/Idea:\s*(.+?)(?:\n|$)/i);
  return match?.[1]?.trim() || prompt.slice(0, 200);
}

function extractDuration(prompt: string): number | null {
  const match = prompt.match(/Duration:\s*(\d+)/i) || prompt.match(/(\d+)\s*seconds/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractGenerationMode(prompt: string): string {
  const match = prompt.match(/Mode:\s*(\w+)/i);
  return match?.[1]?.toUpperCase() || "FAST";
}

function extractName(prompt: string): string | null {
  const match = prompt.match(/Name:\s*(.+?)(?:\n|$)/i);
  return match?.[1]?.trim() || null;
}

function generateTitle(idea: string): string {
  const words = idea.split(/\s+/).slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function generateHook(idea: string): string {
  const hooks = [
    "Nobody expected what happened next…",
    "At midnight, everything changed…",
    "He thought it was an ordinary day…",
    "Something was waiting in the shadows…",
    "The truth was hidden for years…",
  ];
  return hooks[Math.floor(Math.random() * hooks.length)] + ` ${idea.split(".")[0]}.`;
}

function extractCharacters(idea: string): Array<Record<string, unknown>> {
  const chars: Array<Record<string, unknown>> = [];
  if (/pilot/i.test(idea)) {
    chars.push({
      name: "Pilot",
      age: 28,
      gender: "male",
      appearance: "weathered flight jacket, determined eyes",
      hair: "short dark hair",
      clothing: "navy flight suit, leather jacket",
      bodyType: "athletic",
      facialFeatures: "strong jaw, focused gaze",
      personality: "resilient explorer",
      visualIdentity: "28-year-old male pilot, dark hair, navy flight jacket, athletic build",
    });
  }
  if (/boy|child|kid/i.test(idea)) {
    chars.push({
      name: "Boy",
      age: 12,
      gender: "male",
      appearance: "curious young face",
      hair: "messy brown hair",
      clothing: "simple t-shirt and jeans",
      bodyType: "slender",
      facialFeatures: "wide curious eyes",
      personality: "adventurous",
      visualIdentity: "12-year-old boy, messy brown hair, curious expression",
    });
  }
  if (chars.length === 0) {
    chars.push({
      name: "Protagonist",
      age: 25,
      gender: "neutral",
      appearance: "distinctive presence",
      hair: "dark hair",
      clothing: "casual modern attire",
      bodyType: "average",
      facialFeatures: "expressive eyes",
      personality: "determined",
      visualIdentity: "25-year-old protagonist, dark hair, expressive eyes",
    });
  }
  return chars;
}

function generateNarration(idea: string, index: number, total: number): string {
  const parts = [
    `It began with a simple moment. ${idea.split(".")[0]}.`,
    "The journey took an unexpected turn.",
    "Every step revealed something new.",
    "The mystery deepened with each discovery.",
    "Nothing could prepare them for what lay ahead.",
    "In the silence, the truth emerged.",
    "And finally, everything became clear.",
  ];
  if (index === 0) return parts[0];
  if (index === total - 1) return "In the end, the story changed everything.";
  return parts[index % parts.length];
}

function generateVisual(idea: string, index: number, total: number): string {
  const base = idea.split(".")[0];
  const stages = [
    `Opening scene: ${base}, atmospheric wide establishing shot`,
    `Character approaches the scene: ${base}, tension building`,
    `Discovery moment in the story: ${base}`,
    `Dramatic revelation: ${base}, intense close-up`,
    `Climactic scene: ${base}, dynamic action`,
    `Resolution: ${base}, emotional payoff`,
  ];
  return stages[index % stages.length];
}

function generateEnvironment(idea: string, index: number): string {
  if (/island|ocean|crash/i.test(idea)) return index % 2 === 0 ? "tropical coastline, storm clouds" : "dense jungle, mist";
  if (/house|room|abandoned/i.test(idea)) return index % 2 === 0 ? "abandoned interior, dust particles" : "dark hidden passage";
  return "cinematic environment, atmospheric fog";
}

function pickCamera(index: number): string {
  const movements = ["slow zoom in", "slow pan left", "push in", "slow zoom out", "vertical pan"];
  return movements[index % movements.length];
}

function pickSfx(index: number): string[] {
  const all = ["wind", "rain", "footsteps", "door creak", "ambient tension"];
  return [all[index % all.length]];
}

function pickEmotion(index: number, total: number): string {
  if (index === 0) return "curious";
  if (index === total - 1) return "resolved";
  return "tense";
}

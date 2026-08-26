import { generateDirectorStory } from "@/lib/director";
import { distributeDurations } from "@/lib/utils";
import type { LLMProvider, LLMGenerateOptions, LLMResponse } from "./types";

export class MockLLMProvider implements LLMProvider {
  readonly name = "mock";

  async generate(options: LLMGenerateOptions): Promise<LLMResponse> {
    if (options.prompt.includes("social media metadata")) {
      return this.metadataResponse(options);
    }

    if (options.prompt.includes("character visual bible")) {
      return this.characterBibleResponse(options);
    }

    if (options.prompt.includes("image/video prompt") || options.prompt.includes("detailed image/video prompt")) {
      return this.sceneVisualResponse(options);
    }

    return this.storyResponse(options);
  }

  private storyResponse(options: LLMGenerateOptions): LLMResponse {
    const directorInput = extractDirectorInput(options.prompt);
    const directorStory = generateDirectorStory(directorInput);
    const { continuity, ...story } = directorStory;

    return {
      text: JSON.stringify(story),
      provider: this.name,
      usage: { inputTokens: 100, outputTokens: 800 },
      cost: 0.01,
      // continuity used internally by scene-generation via idea re-detection
    };
  }

  private metadataResponse(options: LLMGenerateOptions): LLMResponse {
    const idea = extractField(options.prompt, "Title") || extractIdea(options.prompt);
    const meta = {
      youtubeTitle: String(idea).slice(0, 70),
      youtubeDescription: `${idea}\n\nCreated with AI Video Studio.`,
      youtubeHashtags: "#documentary #factory #manufacturing #aivideo #howitsmade",
      instagramCaption: `See how it's made 👇 ${idea}`,
      instagramHashtags: "#reels #factory #howitsmade #aivideo #manufacturing",
      tiktokCaption: `How it's actually made 🔧 ${String(idea).slice(0, 80)}`,
      tiktokHashtags: "#fyp #factory #howitsmade #aivideo #manufacturing",
    };
    return { text: JSON.stringify(meta), provider: this.name, cost: 0.001 };
  }

  private characterBibleResponse(options: LLMGenerateOptions): LLMResponse {
    const name = extractField(options.prompt, "Name") || "Lead Engineer";
    const char = {
      name,
      age: 32,
      gender: "female",
      appearance: "professional factory engineer, natural realistic face",
      hair: "dark hair tied back under helmet",
      clothing: "navy blue factory uniform, white safety helmet, clear safety glasses",
      bodyType: "average athletic",
      facialFeatures: "focused expression, natural proportions",
      personality: "meticulous and professional",
      visualIdentity:
        "factory engineer in navy blue uniform, white safety helmet, clear safety glasses, natural realistic appearance",
      visualToken: "navy uniform, white helmet, safety glasses",
    };
    return { text: JSON.stringify(char), provider: this.name, cost: 0.001 };
  }

  private sceneVisualResponse(options: LLMGenerateOptions): LLMResponse {
    const idea = extractIdea(options.prompt) || "cinematic scene";
    const visual = {
      visualPrompt:
        "hyper-realistic documentary footage, professional cinema camera, controlled static shot, active physical motion, " +
        idea +
        ", natural color grading, subtle film grain, no visible text",
      negativePrompt:
        "title cards, text overlays, half CGI look, AI slideshow, cartoon, floating objects, deformed hands, extra fingers, static shot, blank background, excessive camera movement, low quality",
      cameraShot: "medium shot",
      cameraMovement: "slow tracking",
      lighting: "cinematic industrial",
      environment: "modern factory",
      characterPositioning: "natural interaction with equipment",
      emotion: "focused",
      transition: "cut",
    };
    return { text: JSON.stringify(visual), provider: this.name, cost: 0.001 };
  }
}

function extractDirectorInput(prompt: string) {
  return {
    idea: extractIdea(prompt),
    duration: extractDuration(prompt) || 30,
    language: extractField(prompt, "Language") || "en",
    tone: extractField(prompt, "Tone") || "cinematic",
    platform: extractField(prompt, "Platform") || "YOUTUBE",
    visualStyle: extractField(prompt, "Visual Style") || "CINEMATIC",
    generationMode: extractGenerationMode(prompt),
    aspectRatio: extractField(prompt, "Aspect Ratio") || undefined,
    voice: extractField(prompt, "Voice") || "NONE",
    videoType: extractField(prompt, "Video Type") || undefined,
  };
}

function extractIdea(prompt: string): string {
  const match = prompt.match(/Idea:\s*(.+?)(?:\n|$)/i);
  return match?.[1]?.trim() || prompt.slice(0, 200);
}

function extractDuration(prompt: string): number | null {
  const match =
    prompt.match(/Target Duration:\s*(\d+)/i) ||
    prompt.match(/Duration:\s*(\d+)/i) ||
    prompt.match(/(\d+)\s*seconds/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractGenerationMode(prompt: string): string {
  const match = prompt.match(/Mode:\s*(\w+)/i);
  return match?.[1]?.toUpperCase() || "FAST";
}

function extractField(prompt: string, field: string): string | null {
  const match = prompt.match(new RegExp(`${field}:\\s*(.+?)(?:\\n|$)`, "i"));
  return match?.[1]?.trim() || null;
}

// Legacy helpers kept for any external references
export function legacyDistributeForTests(totalSeconds: number, sceneCount: number): number[] {
  return distributeDurations(totalSeconds, sceneCount);
}

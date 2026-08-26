import { createProviders } from "@/providers";
import { storyPrompt } from "@/lib/prompts";
import { StorySchema, type Story } from "@/lib/schemas";
import { parseAiJson } from "@/lib/utils";
import { videoLog } from "@/lib/logger";
import { CostTrackingService } from "./cost-tracking";

export interface StoryGenerationInput {
  idea: string;
  videoType: string;
  duration: number;
  language: string;
  tone: string;
  platform: string;
  visualStyle: string;
  generationMode: string;
  projectId?: string;
}

export class StoryGenerationService {
  private costTracker = new CostTrackingService();

  async generate(input: StoryGenerationInput): Promise<Story> {
    const providers = createProviders();
    const prompt = storyPrompt(input);

    videoLog("Generating story", { projectId: input.projectId, operation: "CREATE_SCRIPT" });

    let response;
    try {
      response = await providers.llm.generate({
        prompt,
        systemPrompt: "You are a professional short-form video scriptwriter. Always return valid JSON.",
        jsonMode: true,
        temperature: 0.8,
      });
    } catch (error) {
      videoLog("Story generation failed", { projectId: input.projectId, error: String(error) }, "error");
      throw error;
    }

    if (input.projectId) {
      await this.costTracker.track({
        projectId: input.projectId,
        category: "llm",
        provider: response.provider,
        operation: "story_generation",
        amount: response.cost || 0.01,
      });
    }

    const story = await parseAiJson(response.text, StorySchema);

    // Validate duration
    const totalDuration = story.scenes.reduce((sum, s) => sum + s.duration, 0);
    if (Math.abs(totalDuration - input.duration) > 2) {
      this.normalizeDurations(story, input.duration);
    }

    return story;
  }

  private normalizeDurations(story: Story, targetDuration: number): void {
    const sceneCount = story.scenes.length;
    const base = targetDuration / sceneCount;
    story.scenes.forEach((scene, i) => {
      scene.duration = Math.round(base * 10) / 10;
    });
    const total = story.scenes.reduce((s, sc) => s + sc.duration, 0);
    if (total !== targetDuration) {
      story.scenes[sceneCount - 1].duration += targetDuration - total;
    }
    story.duration = targetDuration;
  }
}

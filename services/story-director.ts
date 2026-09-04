import { createProviders } from "@/providers";
import { parseAiJson } from "@/lib/utils";
import { StoryPlanSchema, type CreateStoryProjectInput, type StoryPlan } from "@/lib/story-studio/schemas";
import {
  STORY_DIRECTOR_SYSTEM_PROMPT,
  buildStoryDirectorUserPrompt,
} from "@/lib/story-studio/prompts/story-director";
import { BuiltinStoryDirector } from "@/services/builtin-story-director";
import { env } from "@/config/env";

export class StoryDirectorService {
  private builtin = new BuiltinStoryDirector();

  async generate(input: CreateStoryProjectInput): Promise<StoryPlan> {
    const canUseLlm =
      (env.AI_TEXT_PROVIDER === "openai" && (env.OPENAI_API_KEY || env.LLM_API_KEY)) ||
      env.AI_TEXT_PROVIDER === "cursor";

    if (canUseLlm) {
      try {
        return await this.generateWithLlm(input);
      } catch {
        // Fall back to built-in director
      }
    }

    return this.builtin.generate(input);
  }

  private async generateWithLlm(input: CreateStoryProjectInput): Promise<StoryPlan> {
    const providers = createProviders();
    const response = await providers.llm.generate({
      prompt: buildStoryDirectorUserPrompt(input),
      systemPrompt: STORY_DIRECTOR_SYSTEM_PROMPT,
      jsonMode: true,
      temperature: 0.75,
    });

    const parsed = await parseAiJson(response.text, StoryPlanSchema);
    return StoryPlanSchema.parse(parsed);
  }
}

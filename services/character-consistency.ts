import { prisma } from "@/lib/db";
import { createProviders } from "@/providers";
import { characterBiblePrompt } from "@/lib/prompts";
import { CharacterSchema, type CharacterData } from "@/lib/schemas";
import { parseAiJson } from "@/lib/utils";
import { CostTrackingService } from "./cost-tracking";

export class CharacterConsistencyService {
  private costTracker = new CostTrackingService();

  buildVisualToken(character: CharacterData): string {
    const parts = [
      character.name,
      character.age ? `${character.age}-year-old` : "",
      character.gender || "",
      character.hair || "",
      character.clothing || "",
      character.facialFeatures || "",
    ].filter(Boolean);
    return parts.join(", ");
  }

  async generateBible(
    name: string,
    description: string,
    projectId?: string,
  ): Promise<CharacterData & { visualToken: string }> {
    const providers = createProviders();
    const prompt = characterBiblePrompt({ name, description });
    const response = await providers.llm.generate({ prompt, jsonMode: true });

    if (projectId) {
      await this.costTracker.track({
        projectId,
        category: "llm",
        provider: response.provider,
        operation: "character_bible",
        amount: response.cost || 0.005,
      });
    }

    const parsed = await parseAiJson(response.text, CharacterSchema);
    const visualToken =
      (parsed as CharacterData & { visualToken?: string }).visualToken ||
      this.buildVisualToken(parsed);
    const char = { ...parsed, visualToken };
    return { ...char, visualToken };
  }

  async saveCharacters(projectId: string, characters: Array<CharacterData & { visualToken?: string }>) {
    const saved = [];
    for (const char of characters) {
      const visualToken = char.visualToken || this.buildVisualToken(char);
      const record = await prisma.character.create({
        data: {
          projectId,
          name: char.name,
          age: char.age,
          gender: char.gender,
          appearance: char.appearance,
          hair: char.hair,
          clothing: char.clothing,
          bodyType: char.bodyType,
          facialFeatures: char.facialFeatures,
          personality: char.personality,
          visualIdentity: char.visualIdentity,
          visualToken,
        },
      });
      saved.push(record);
    }
    return saved;
  }

  enrichPromptWithCharacters(
    prompt: string,
    characters: Array<{ name: string; visualToken?: string | null; visualIdentity?: string | null }>,
  ): string {
    if (characters.length === 0) return prompt;
    const charDesc = characters
      .map((c) => `${c.name}: ${c.visualToken || c.visualIdentity || ""}`)
      .join("; ");
    return `${prompt}. Characters: ${charDesc}`;
  }
}

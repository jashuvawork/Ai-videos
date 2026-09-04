import { describe, expect, it } from "vitest";
import { BuiltinStoryDirector } from "@/services/builtin-story-director";
import { StoryPlanSchema } from "@/lib/story-studio/schemas";

describe("BuiltinStoryDirector", () => {
  it("generates taxi crime story with gameplay and AI shot flags", () => {
    const director = new BuiltinStoryDirector();
    const plan = director.generate({
      idea: "A poor taxi driver accidentally picks up a billionaire who is being hunted by the police.",
      genre: "Crime Thriller",
      durationMinutes: 8,
      visualStyle: "Cinematic GTA",
      narrationStyle: "Deep cinematic male",
      language: "en",
      targetAudience: "YouTube 18-34",
      gameplaySource: "Licensed GTA",
      voice: "MALE",
      musicStyle: "Suspense",
      pacing: "fast",
      assetRights: "OWNED",
    });

    const parsed = StoryPlanSchema.parse(plan);
    expect(parsed.scenes.length).toBeGreaterThanOrEqual(10);
    expect(parsed.characters.length).toBeGreaterThanOrEqual(2);
    expect(parsed.scenes.some((s) => s.gameplaySearchTerms.includes("taxi"))).toBe(true);
    expect(parsed.scenes.some((s) => s.aiVideoRequired)).toBe(true);
    expect(parsed.scenes.some((s) => !s.aiVideoRequired)).toBe(true);

    const totalDuration = parsed.scenes.reduce((sum, s) => sum + s.duration, 0);
    expect(totalDuration).toBeCloseTo(480, 0);
  });
});

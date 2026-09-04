import { describe, it, expect } from "vitest";
import { scoreClipForScene, findBestGameplayMatch } from "@/services/gameplay-matcher";
import type { StoryScene } from "@/lib/story-studio/schemas";

const baseScene: StoryScene = {
  sceneId: "s1",
  startTime: 0,
  duration: 12,
  purpose: "Chase",
  emotion: "suspense",
  location: "city downtown",
  timeOfDay: "night",
  weather: "rain",
  visualDescription: "Taxi chase",
  camera: "third person",
  gameplaySearchTerms: ["taxi", "chase", "night", "rain", "city"],
  aiVideoRequired: false,
  imageRequired: false,
  dialogue: [],
  soundEffects: [],
  transition: "cut",
};

describe("gameplay-matcher", () => {
  it("scores high for matching tags", () => {
    const result = scoreClipForScene(
      {
        id: "c1",
        tags: ["taxi", "chase", "night", "rain", "city"],
        metadata: { location: "city", timeOfDay: "night", weather: "rain", mood: "suspense" },
        duration: 15,
      },
      baseScene,
    );
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it("returns null when ai video required", () => {
    const match = findBestGameplayMatch(
      [{ id: "c1", tags: ["taxi"], metadata: null, duration: 10 }],
      { ...baseScene, aiVideoRequired: true },
    );
    expect(match).toBeNull();
  });

  it("returns best clip above threshold", () => {
    const match = findBestGameplayMatch(
      [
        { id: "weak", tags: ["beach"], metadata: null, duration: 5 },
        {
          id: "strong",
          tags: ["taxi", "chase", "night"],
          metadata: { timeOfDay: "night" },
          duration: 12,
        },
      ],
      baseScene,
    );
    expect(match?.clipId).toBe("strong");
  });
});

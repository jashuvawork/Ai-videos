import { describe, it, expect } from "vitest";
import { generateShortsFromPlan } from "@/services/shorts-engine";
import type { StoryPlan } from "@/lib/story-studio/schemas";

const miniPlan: StoryPlan = {
  title: "Test Story",
  logline: "A test",
  genre: "Thriller",
  tone: "dark",
  targetDurationSeconds: 120,
  visualStyle: "Cinematic",
  characters: [],
  locations: [],
  storyBeats: [],
  scenes: [
    {
      sceneId: "1",
      startTime: 0,
      duration: 8,
      purpose: "Hook — shocking reveal",
      emotion: "shock",
      location: "street",
      timeOfDay: "night",
      visualDescription: "Hook scene",
      camera: "close",
      gameplaySearchTerms: [],
      aiVideoRequired: true,
      imageRequired: false,
      dialogue: [],
      soundEffects: [],
      transition: "cut",
      narration: "Something was wrong.",
    },
    {
      sceneId: "2",
      startTime: 8,
      duration: 15,
      purpose: "Setup",
      emotion: "calm",
      location: "taxi",
      timeOfDay: "night",
      visualDescription: "Driving",
      camera: "wide",
      gameplaySearchTerms: ["taxi"],
      aiVideoRequired: false,
      imageRequired: false,
      dialogue: [],
      soundEffects: [],
      transition: "cut",
    },
  ],
};

describe("shorts-engine", () => {
  it("generates short concepts from high-score scenes", () => {
    const shorts = generateShortsFromPlan(miniPlan, 3);
    expect(shorts.length).toBeGreaterThan(0);
    expect(shorts[0].hook).toBeTruthy();
    expect(shorts[0].durationSeconds).toBeGreaterThanOrEqual(20);
  });
});

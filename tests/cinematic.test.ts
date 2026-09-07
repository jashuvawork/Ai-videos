import { describe, it, expect } from "vitest";
import {
  CROSSFADE_SECONDS,
  SOCIAL_STORY_FACE_LOCK,
  SOCIAL_STORY_NO_TEXT,
  buildXfadeFilter,
  cinematicStoryVisualPrompt,
  pollinationsFrameSize,
  sceneStartTimes,
  totalTimelineDuration,
} from "@/lib/cinematic";

describe("cinematic story edit", () => {
  it("sequences scene start times with crossfades", () => {
    expect(sceneStartTimes([6, 6, 6], 0.5)).toEqual([0, 5.5, 11]);
  });

  it("shortens the cut by overlapping fades", () => {
    expect(totalTimelineDuration([6, 6, 6], 0.5)).toBe(17);
  });

  it("builds a chained xfade graph", () => {
    const graph = buildXfadeFilter(3, [5, 5, 5], 0.4);
    expect(graph).toContain("xfade=transition=fade");
    expect(graph).toContain("[0:v][1:v]");
    expect(graph).toContain("[v]");
  });

  it("copies a single clip without xfade", () => {
    expect(buildXfadeFilter(1, [8])).toBe("[0:v]copy[v]");
  });
});

describe("cinematic story prompts", () => {
  it("locks characters and forbids on-screen text", () => {
    const prompt = cinematicStoryVisualPrompt({
      visual: "Taxi drives through rain at night",
      camera: "tracking",
      location: "Los Santos",
      timeOfDay: "night",
      characters: [{ name: "Marcus", description: "tired taxi driver, worn jacket" }],
    });
    expect(prompt).toContain("Marcus");
    expect(prompt).toMatch(/photoreal live-action/i);
    expect(prompt).toContain("SCENE: Taxi drives through rain at night");
    expect(prompt).toContain(SOCIAL_STORY_NO_TEXT);
    expect(prompt).toContain(SOCIAL_STORY_FACE_LOCK);
    expect(prompt.toLowerCase()).toContain("two eyes");
    expect(prompt.toLowerCase()).not.toContain("add subtitles");
    expect(prompt.toLowerCase()).not.toContain("shot on 35mm");
    expect(prompt.toLowerCase()).not.toContain("film still");
  });

  it("uses the default social fade length", () => {
    expect(CROSSFADE_SECONDS).toBeGreaterThan(0.2);
    expect(CROSSFADE_SECONDS).toBeLessThan(1);
  });

  it("preserves 9:16 when capping Pollinations size", () => {
    expect(pollinationsFrameSize(1080, 1920)).toEqual({ width: 720, height: 1280 });
    expect(pollinationsFrameSize(1920, 1080)).toEqual({ width: 1280, height: 720 });
  });
});

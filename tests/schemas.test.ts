import { describe, it, expect } from "vitest";
import { StorySchema, SceneSchema } from "@/lib/schemas";
import { distributeDurations, sumDurations, parseJsonSafe } from "@/lib/utils";

describe("Story Schema", () => {
  it("validates a correct story structure", () => {
    const story = {
      title: "The Secret Room",
      hook: "Nobody knew what was beneath...",
      summary: "A boy discovers a hidden room",
      duration: 30,
      tone: "cinematic",
      characters: [{ name: "Boy", age: 12 }],
      scenes: [
        { sceneNumber: 1, duration: 6, visualDescription: "Dark basement" },
        { sceneNumber: 2, duration: 8, visualDescription: "Hidden door" },
        { sceneNumber: 3, duration: 8, visualDescription: "Secret room" },
        { sceneNumber: 4, duration: 6, visualDescription: "Discovery" },
        { sceneNumber: 5, duration: 10, visualDescription: "Revelation" },
      ],
    };

    const result = StorySchema.parse(story);
    expect(result.title).toBe("The Secret Room");
    expect(result.scenes.length).toBe(5);
    expect(sumDurations(result.scenes.map((s) => s.duration))).toBe(38);
  });

  it("rejects story without scenes", () => {
    expect(() =>
      StorySchema.parse({
        title: "Test",
        hook: "Hook",
        summary: "Summary",
        duration: 30,
        tone: "cinematic",
        characters: [],
        scenes: [],
      }),
    ).toThrow();
  });
});

describe("Scene Duration Calculation", () => {
  it("distributes durations evenly", () => {
    const durations = distributeDurations(30, 6);
    expect(durations.length).toBe(6);
    expect(sumDurations(durations)).toBe(30);
  });

  it("distributes 45 seconds across scenes", () => {
    const durations = distributeDurations(45, 9);
    expect(sumDurations(durations)).toBe(45);
  });

  it("handles uneven distribution", () => {
    const durations = distributeDurations(30, 7);
    expect(sumDurations(durations)).toBe(30);
  });
});

describe("Scene Schema", () => {
  it("validates scene with defaults", () => {
    const scene = SceneSchema.parse({
      sceneNumber: 1,
      duration: 5,
      visualDescription: "A dark forest at night",
    });
    expect(scene.narration).toBe("");
    expect(scene.transition).toBe("cut");
  });
});

describe("JSON Parsing", () => {
  it("parses valid JSON", () => {
    const result = parseJsonSafe<{ title: string }>('{"title":"Test"}');
    expect(result?.title).toBe("Test");
  });

  it("returns null for invalid JSON", () => {
    expect(parseJsonSafe("not json")).toBeNull();
  });
});

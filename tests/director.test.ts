import { describe, it, expect } from "vitest";
import { detectContentType } from "@/lib/director/detect";
import { calculateSceneCount } from "@/lib/director/scene-count";
import { generateDirectorStory, selectScenesForDuration } from "@/lib/director";
import { MANUFACTURING_SCENES } from "@/lib/director/templates/manufacturing";
import { sumDurations } from "@/lib/utils";
import { MockLLMProvider } from "@/providers/llm/mock";
import { StorySchema } from "@/lib/schemas";
import { storyPrompt } from "@/lib/prompts";

describe("Director content detection", () => {
  it("detects manufacturing ideas", () => {
    expect(detectContentType("mobile phone making in a factory")).toBe("manufacturing");
    expect(detectContentType("smartphone assembly line")).toBe("manufacturing");
    expect(detectContentType("how circuit boards are made")).toBe("manufacturing");
  });

  it("detects food process ideas", () => {
    expect(detectContentType("how chocolate is made")).toBe("food_process");
  });

  it("defaults to narrative for story ideas", () => {
    expect(detectContentType("A boy finds a mysterious door")).toBe("narrative");
  });
});

describe("Director scene count", () => {
  it("targets 8-10 scenes for 30s", () => {
    const count = calculateSceneCount(30, "FAST");
    expect(count).toBeGreaterThanOrEqual(8);
    expect(count).toBeLessThanOrEqual(10);
  });

  it("targets 12-15 scenes for 60s", () => {
    const count = calculateSceneCount(60, "FAST");
    expect(count).toBeGreaterThanOrEqual(12);
    expect(count).toBeLessThanOrEqual(15);
  });
});

describe("Manufacturing director story", () => {
  it("generates multi-scene factory pipeline for phone manufacturing", () => {
    const story = generateDirectorStory({
      idea: "Mobile phone making in a factory",
      duration: 30,
      language: "en",
      tone: "documentary",
      platform: "YOUTUBE",
      visualStyle: "CINEMATIC",
      generationMode: "FAST",
    });

    expect(story.scenes.length).toBeGreaterThanOrEqual(8);
    expect(sumDurations(story.scenes.map((s) => s.duration))).toBe(30);
    expect(story.title.toLowerCase()).toMatch(/made|smartphone|novatech/);
    expect(story.scenes[0].caption).toBe("FACTORY INTRODUCTION");
    expect(story.scenes.some((s) => s.caption === "PHONE ASSEMBLY")).toBe(true);
    expect(story.scenes.some((s) => s.caption === "QUALITY CONTROL")).toBe(true);
    expect(story.scenes[story.scenes.length - 1].caption).toBe("FINISHED PRODUCT");

    const visualText = story.scenes.map((s) => s.visualDescription).join(" ");
    expect(visualText.toLowerCase()).toMatch(/novatech|smartphone|factory/);
  });

  it("maintains chronological manufacturing order when trimmed", () => {
    const selected = selectScenesForDuration(MANUFACTURING_SCENES, 8);
    const keys = selected.map((s) => s.key);
    expect(keys[0]).toBe("factory_intro");
    expect(keys[keys.length - 1]).toBe("hero_shot");
    expect(keys).toContain("pcb_assembly");
    expect(keys).toContain("phone_assembly_1");
  });
});

describe("MockLLM director integration", () => {
  it("returns valid manufacturing story JSON from story prompt", async () => {
    const llm = new MockLLMProvider();
    const prompt = storyPrompt({
      idea: "Mobile phone making in a factory",
      videoType: "DOCUMENTARY",
      duration: 30,
      language: "en",
      tone: "documentary",
      platform: "YOUTUBE",
      visualStyle: "CINEMATIC",
      generationMode: "FAST",
    });

    const response = await llm.generate({ prompt, jsonMode: true });
    const story = StorySchema.parse(JSON.parse(response.text));

    expect(story.scenes.length).toBeGreaterThanOrEqual(8);
    expect(story.scenes[0].narration.toLowerCase()).toMatch(/smartphone|factory|wondered/);
    expect(story.scenes.some((s) => /pcb|circuit|motherboard/i.test(s.visualDescription))).toBe(true);
  });
});

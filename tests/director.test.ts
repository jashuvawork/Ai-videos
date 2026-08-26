import { describe, it, expect } from "vitest";
import { detectContentType } from "@/lib/director/detect";
import { calculateSceneCount } from "@/lib/director/scene-count";
import { buildVisualPrompt } from "@/lib/director/visual-prompt";
import { buildContinuityBible } from "@/lib/director/continuity";
import { buildContinuityIdentities } from "@/lib/director/continuity-engine";
import {
  generateDirectorStory,
  selectScenesForDuration,
  validateSceneDescription,
} from "@/lib/director";
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

describe("Hyper-realistic director", () => {
  it("builds continuity identities for manufacturing", () => {
    const ids = buildContinuityIdentities("manufacturing", "NovaTech X9 factory");
    expect(ids.phoneIdentity).toMatch(/PHONE_IDENTITY/);
    expect(ids.factoryIdentity).toMatch(/FACTORY_IDENTITY/);
    expect(ids.productReference).toMatch(/PRODUCT_REFERENCE/);
  });

  it("generates action-focused story without caption labels", () => {
    const story = generateDirectorStory({
      idea: "How the NovaTech X9 is made",
      duration: 30,
      language: "en",
      tone: "documentary",
      platform: "YOUTUBE",
      visualStyle: "CINEMATIC",
      generationMode: "FAST",
      voice: "MALE",
    });

    expect(story.scenes.length).toBeGreaterThanOrEqual(8);
    expect(sumDurations(story.scenes.map((s) => s.duration))).toBe(30);
    expect(story.scenes.every((s) => s.caption === "")).toBe(true);
    expect(story.continuity.captureMedium).toMatch(/documentary/i);
    expect(story.scenes.some((s) => /clamp|CNC|metal particles/i.test(s.visualDescription))).toBe(true);
  });

  it("builds hyper-realistic visual prompts with capture medium", () => {
    const continuity = buildContinuityBible("manufacturing", "smartphone factory");
    const scene = MANUFACTURING_SCENES.find((s) => s.key === "frame_machining")!;
    const built = buildVisualPrompt({
      scene,
      continuity,
      visualStyle: "CINEMATIC",
      aspectRatio: "RATIO_16_9",
    });

    expect(built.visualPrompt).toMatch(/documentary/i);
    expect(built.visualPrompt).toMatch(/one or two subjects/i);
    expect(built.negativePrompt).toMatch(/title cards|CGI look/i);
    expect(validateSceneDescription(built.visualPrompt).valid).toBe(true);
  });

  it("rejects title-card style descriptions in validation", () => {
    const result = validateSceneDescription("RAW MATERIALS title card on colored background");
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("maintains chronological order when trimmed to 8 scenes", () => {
    const selected = selectScenesForDuration(MANUFACTURING_SCENES, 8);
    const keys = selected.map((s) => s.key);
    expect(keys[0]).toBe("factory_intro");
    expect(keys[keys.length - 1]).toBe("hero_outbound");
    expect(keys).toContain("pcb_smt");
    expect(keys).toContain("motherboard_install");
  });
});

describe("MockLLM director integration", () => {
  it("returns valid hyper-realistic manufacturing story JSON", async () => {
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
      voice: "MALE",
    });

    const response = await llm.generate({ prompt, jsonMode: true });
    const story = StorySchema.parse(JSON.parse(response.text));

    expect(story.scenes.length).toBeGreaterThanOrEqual(8);
    expect(story.scenes.every((s) => s.caption === "")).toBe(true);
    expect(story.scenes.some((s) => /robotic|conveyor|fixture|clamp/i.test(s.visualDescription))).toBe(true);
  });
});

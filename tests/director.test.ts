import { describe, it, expect } from "vitest";
import { detectContentType, resolveContentType } from "@/lib/director/detect";
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
import { ProcessContinuityService, detectProcessSubject } from "@/services/process-continuity";
import { ReferenceAnalysisService } from "@/services/reference-analysis";
import { VisualConsistencyCheckService } from "@/services/visual-consistency-check";

describe("Director content detection", () => {
  it("detects manufacturing ideas", () => {
    expect(detectContentType("mobile phone making in a factory")).toBe("manufacturing");
    expect(detectContentType("smartphone assembly line")).toBe("manufacturing");
    expect(detectContentType("how circuit boards are made")).toBe("manufacturing");
  });

  it("detects food process ideas", () => {
    expect(detectContentType("how chocolate is made")).toBe("food_process");
    expect(detectContentType("how biscuits are made in a factory")).toBe("food_process");
  });

  it("routes MANUFACTURING video type to process content", () => {
    expect(resolveContentType("how biscuits are made", "MANUFACTURING")).toBe("food_process");
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
      idea: "mobile phone making in a factory",
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
    expect(story.scenes.some((s) => /clamp|CNC|metal particles|robotic|conveyor/i.test(s.visualDescription))).toBe(
      true,
    );
    expect(story.scenes.every((s) => !/RAW MATERIALS|PCB PRODUCTION|PHONE ASSEMBLY/.test(s.caption))).toBe(true);
  });

  it("omits narration when voice is NONE", () => {
    const story = generateDirectorStory({
      idea: "Mobile phone making in a factory",
      duration: 30,
      language: "en",
      tone: "documentary",
      platform: "YOUTUBE",
      visualStyle: "CINEMATIC",
      generationMode: "FAST",
      voice: "NONE",
    });

    expect(story.scenes.every((s) => s.narration === "")).toBe(true);
  });

  it("builds visual prompts with no-text negative prompts", () => {
    const continuity = buildContinuityBible("manufacturing", "smartphone factory");
    const scene = MANUFACTURING_SCENES[1];
    const built = buildVisualPrompt({
      scene,
      continuity,
      visualStyle: "CINEMATIC",
      aspectRatio: "RATIO_16_9",
    });

    expect(built.visualPrompt).toMatch(/no visible text|physically happening|documentary/i);
    expect(built.negativePrompt).toMatch(/title cards|text overlays|subtitles/i);
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
    expect(story.scenes.some((s) => /robotic|conveyor|fixture|clamp|assembly/i.test(s.visualDescription))).toBe(
      true,
    );
  });
});

describe("Biscuit manufacturing pipeline", () => {
  it("detects biscuit subject and builds process chain", () => {
    expect(detectProcessSubject("How biscuits are made in a factory")).toBe("biscuits");
    const service = new ProcessContinuityService();
    const chain = service.buildChain("How biscuits are made in a factory");
    expect(chain.length).toBeGreaterThanOrEqual(10);
    expect(chain[0].key).toBe("raw_receiving");
    expect(chain.some((s) => s.key === "mixing")).toBe(true);
    expect(chain[chain.length - 1].key).toBe("finished_product");
    const mixing = chain.find((s) => s.key === "mixing")!;
    expect(mixing.action).toMatch(/mixing blades|mixer/i);
    expect(mixing.outputState).toMatch(/dough/i);
  });

  it("generates biscuit food_process story with active factory scenes", () => {
    const story = generateDirectorStory({
      idea: "How biscuits are made in a factory",
      duration: 30,
      language: "en",
      tone: "documentary",
      platform: "INSTAGRAM_REEL",
      visualStyle: "DOCUMENTARY",
      generationMode: "FAST",
      videoType: "MANUFACTURING",
      voice: "NONE",
    });

    expect(story.continuity.contentType).toBe("food_process");
    expect(story.scenes.length).toBeGreaterThanOrEqual(8);
    expect(story.scenes.some((s) => /mixer|dough|conveyor|baking|biscuit/i.test(s.visualDescription))).toBe(true);
    expect(story.scenes.every((s) => s.caption === "")).toBe(true);
    expect(story.scenes.every((s) => s.sceneKey)).toBe(true);
  });

  it("rejects portrait-biased prompts in visual consistency check", () => {
    const checker = new VisualConsistencyCheckService();
    const result = checker.checkScene(
      {
        sceneNumber: 1,
        duration: 3,
        visualDescription: "fashion model portrait looking at camera",
        narration: "",
        dialogue: "",
        cameraMovement: "static",
        cameraAngle: "close-up",
        lighting: "cinematic",
        environment: "",
        soundEffects: [],
        musicMood: "cinematic",
        caption: "",
        transition: "cut",
        emotion: "neutral",
      },
      { isProcessVideo: true },
    );
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

describe("Reference style guide", () => {
  it("applies reference style without copying content", () => {
    const service = new ReferenceAnalysisService();
    const profile = {
      aspectRatio: "9:16",
      visualStyle: "muted cinematic documentary tones",
      lighting: "soft dramatic low-key lighting",
      cameraStyle: "controlled slow push-in",
      shotTypes: ["close-up"],
      pacing: "deliberate",
      colorTreatment: "slightly desaturated",
      depthOfField: "shallow depth of field",
      composition: "vertical safe area composition",
      transitions: ["cut"],
      realismLevel: "hyper-realistic documentary",
      negativeStyleElements: ["portrait montage", "gradient title cards"],
    };
    const merged = service.applyToPrompt(
      "Stainless mixing blades rotate through thick biscuit dough in industrial mixer",
      profile,
    );
    expect(merged).toMatch(/STYLE GUIDE/);
    expect(merged).toMatch(/Do not copy reference/);
    expect(merged).toMatch(/mixing blades/);
  });
});

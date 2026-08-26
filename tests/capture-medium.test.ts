import { describe, expect, it } from "vitest";
import { captureMediumForContent, DOCUMENTARY_CAPTURE_MEDIUM } from "@/lib/director/capture-medium";
import { buildVisualPrompt } from "@/lib/director/visual-prompt";
import { buildContinuityBible } from "@/lib/director/continuity";
import { MANUFACTURING_SCENES } from "@/lib/director/templates/manufacturing";

describe("capture-medium anti crew prompts", () => {
  it("does not mention film crew or cinema cameras in factory capture text", () => {
    const medium = captureMediumForContent("manufacturing");
    expect(medium).not.toMatch(/crew|camera operator|cinema camera|tripod|behind the scenes/i);
    expect(medium).toMatch(/factory|production|machines/i);
    expect(DOCUMENTARY_CAPTURE_MEDIUM).not.toMatch(/crew perspective/i);
  });

  it("puts scene action before capture medium in manufacturing visual prompts", () => {
    const continuity = buildContinuityBible("manufacturing", "mobile phone factory");
    const scene = MANUFACTURING_SCENES[2];
    const built = buildVisualPrompt({
      scene,
      continuity,
      visualStyle: "DOCUMENTARY",
      aspectRatio: "RATIO_9_16",
    });
    const actionIdx = built.visualPrompt.indexOf(scene.visualDescription.slice(0, 30));
    const factoryIdx = built.visualPrompt.indexOf("factory floor");
    expect(actionIdx).toBeGreaterThanOrEqual(0);
    expect(factoryIdx).toBeGreaterThan(actionIdx);
    expect(built.negativePrompt).toMatch(/film crew|cinema camera/i);
  });
});

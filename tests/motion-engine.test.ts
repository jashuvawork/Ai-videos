import { describe, it, expect } from "vitest";
import { resolveCameraMovement } from "@/providers/studio/motion-engine";
import { shouldGenerateSceneVideos } from "@/lib/video-generation-mode";

describe("motion engine", () => {
  it("maps camera-engine strings to motion presets", () => {
    expect(resolveCameraMovement("slow lateral tracking shot following product on belt")).toBe(
      "tracking lateral",
    );
    expect(resolveCameraMovement("subtle push-in toward rotating paddles")).toBe("push in");
    expect(resolveCameraMovement("static documentary shot with slight handheld micro-movement")).toBe(
      "handheld documentary",
    );
  });
});

describe("shouldGenerateSceneVideos", () => {
  it("enables motion clips for manufacturing FAST mode", () => {
    expect(
      shouldGenerateSceneVideos({
        idea: "How biscuits are made in a factory",
        videoType: "MANUFACTURING",
        generationMode: "FAST",
        visualGenerationMode: "AUTOMATIC",
      }),
    ).toBe(true);
  });

  it("skips motion clips when user selects images only", () => {
    expect(
      shouldGenerateSceneVideos({
        idea: "How biscuits are made",
        videoType: "MANUFACTURING",
        generationMode: "FAST",
        visualGenerationMode: "IMAGES",
      }),
    ).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { AudioTimelineService } from "@/services/audio-timeline";

describe("AudioTimelineService", () => {
  const service = new AudioTimelineService();

  it("builds timeline with correct total duration", () => {
    const timeline = service.buildTimeline([
      { id: "1", sceneNumber: 1, duration: 5, narrationDuration: 4.5 },
      { id: "2", sceneNumber: 2, duration: 6, narrationDuration: 5.8 },
      { id: "3", sceneNumber: 3, duration: 4 },
    ]);

    expect(timeline.scenes.length).toBe(3);
    expect(timeline.totalDuration).toBeGreaterThan(0);
    expect(timeline.scenes[0].startTime).toBe(0);
    expect(timeline.scenes[1].startTime).toBe(timeline.scenes[0].endTime);
  });

  it("extends scene when narration is longer", () => {
    const timeline = service.buildTimeline([
      { id: "1", sceneNumber: 1, duration: 5, narrationDuration: 6.2 },
    ]);

    expect(timeline.scenes[0].adjustedDuration).toBeGreaterThan(5);
  });

  it("calculates narration speed", () => {
    const speed = service.calculateNarrationSpeed("This is a test narration with many words", 3);
    expect(speed).toBeGreaterThan(1);
    expect(speed).toBeLessThanOrEqual(1.5);
  });
});

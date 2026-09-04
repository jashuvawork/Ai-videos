import { describe, it, expect } from "vitest";
import { inferTagsFromFilename, inferMetadata } from "@/services/gameplay-analysis";

describe("gameplay-analysis", () => {
  it("infers tags from filename", () => {
    const tags = inferTagsFromFilename("gta_taxi_chase_night_rain.mp4");
    expect(tags).toContain("taxi");
    expect(tags).toContain("chase");
    expect(tags).toContain("night");
  });

  it("builds metadata from tags", () => {
    const meta = inferMetadata(["chase", "night", "city", "police"]);
    expect(meta.mood).toBe("suspense");
    expect(meta.timeOfDay).toBe("night");
  });
});

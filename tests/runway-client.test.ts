import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clampRunwayDuration,
  mapRunwayRatio,
  mapRunwayTaskProgress,
  uploadEphemeralBuffer,
} from "@/providers/runway/client";

describe("runway client helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps aspect ratios for Runway", () => {
    expect(mapRunwayRatio(1920, 1080)).toBe("1280:720");
    expect(mapRunwayRatio(1080, 1920)).toBe("720:1280");
    expect(mapRunwayRatio(1080, 1080)).toBe("960:960");
  });

  it("clamps duration to Runway limits", () => {
    expect(clampRunwayDuration(1)).toBe(2);
    expect(clampRunwayDuration(5)).toBe(5);
    expect(clampRunwayDuration(15)).toBe(10);
  });

  it("maps task status to progress", () => {
    expect(mapRunwayTaskProgress("PENDING")).toBe(10);
    expect(mapRunwayTaskProgress("RUNNING")).toBe(55);
    expect(mapRunwayTaskProgress("SUCCEEDED")).toBe(100);
    expect(mapRunwayTaskProgress("FAILED")).toBe(0);
  });

  it("uploads ephemeral buffer via presigned URL flow", async () => {
    const initPayload = {
      uploadUrl: "https://upload.example.com/presigned",
      fields: { key: "abc", policy: "policy" },
      runwayUri: "runway://file-123",
    };

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => initPayload,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => "",
        }),
    );

    const uri = await uploadEphemeralBuffer("test-key", Buffer.from("fake-image"), "test.png");
    expect(uri).toBe("runway://file-123");
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

import { describe, it, expect } from "vitest";
import { ContentSafetyService } from "@/services/content-safety";

describe("ContentSafetyService", () => {
  const service = new ContentSafetyService();

  it("allows safe content", async () => {
    const result = await service.checkInput(
      "A young pilot crashes on a mysterious island and discovers a strange abandoned aircraft.",
    );
    expect(result.safe).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it("rejects prohibited content", async () => {
    const result = await service.checkInput("how to make a bomb instructions");
    expect(result.safe).toBe(false);
  });

  it("rejects overly long input", async () => {
    const result = await service.checkInput("a".repeat(6000));
    expect(result.safe).toBe(false);
  });
});

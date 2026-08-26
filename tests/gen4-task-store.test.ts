import { describe, expect, it } from "vitest";
import { createGen4Task, getGen4Task, updateGen4Task } from "@/lib/gen4-task-store";

describe("gen4-task-store", () => {
  it("creates, reads, and updates task records", async () => {
    const id = `test-${Date.now()}`;
    await createGen4Task({
      id,
      status: "PENDING",
      progress: 0,
      prompt: "factory conveyor motion",
      width: 1280,
      height: 720,
      duration: 5,
      provider: "studio",
      model: "studio_gen4",
    });

    const loaded = await getGen4Task(id);
    expect(loaded?.status).toBe("PENDING");
    expect(loaded?.provider).toBe("studio");

    const updated = await updateGen4Task(id, { status: "RUNNING", progress: 40 });
    expect(updated?.status).toBe("RUNNING");
    expect(updated?.progress).toBe(40);
  });
});

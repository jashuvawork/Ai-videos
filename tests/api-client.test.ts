import { describe, it, expect } from "vitest";
import { parseJsonResponse, apiUrl } from "@/lib/api-client";

describe("api-client", () => {
  it("apiUrl uses relative path when no base set", () => {
    expect(apiUrl("/api/projects")).toBe("/api/projects");
  });

  it("parses valid JSON", async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const data = await parseJsonResponse<{ ok: boolean }>(res);
    expect(data.ok).toBe(true);
  });

  it("throws readable error for HTML error pages", async () => {
    const res = new Response("<!DOCTYPE html><html>error</html>", {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });
    await expect(parseJsonResponse(res)).rejects.toThrow(/502/);
  });
});

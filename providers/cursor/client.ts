import { ProviderError } from "@/providers/shared/errors";

const CURSOR_API = "https://api.cursor.com";

export function getCursorApiKey(): string | undefined {
  return process.env.CURSOR_API_KEY?.trim() || undefined;
}

export async function cursorRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const apiKey = getCursorApiKey();
  if (!apiKey) throw new ProviderError("CURSOR_API_KEY not configured", "AUTH_ERROR", false);

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${apiKey}`);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${CURSOR_API}${path}`, {
    ...options,
    headers,
    signal: options.signal ?? AbortSignal.timeout(300000),
  });
}

export async function verifyCursorApiKey(): Promise<boolean> {
  try {
    const response = await cursorRequest("/v1/me");
    return response.ok;
  } catch {
    return false;
  }
}

export interface CursorRunResult {
  status: string;
  text?: string;
  durationMs?: number;
}

export async function createCursorAgentRun(prompt: string, modelId = "composer-2.5"): Promise<{
  agentId: string;
  runId: string;
}> {
  const response = await cursorRequest("/v1/agents", {
    method: "POST",
    body: JSON.stringify({
      prompt: { text: prompt },
      model: { id: modelId },
      name: "AI Video Studio script",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new ProviderError(`Cursor agent create failed: ${err}`, "API_ERROR", response.status >= 500);
  }

  const data = await response.json();
  const agentId = data.agent?.id ?? data.id;
  const runId = data.run?.id ?? data.latestRunId;
  if (!agentId || !runId) {
    throw new ProviderError("Cursor agent response missing ids", "API_ERROR", false);
  }
  return { agentId, runId };
}

export async function waitForCursorRun(
  agentId: string,
  runId: string,
  timeoutMs = 300000,
): Promise<CursorRunResult> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await cursorRequest(`/v1/agents/${agentId}/runs/${runId}`);
    if (!response.ok) {
      const err = await response.text();
      throw new ProviderError(`Cursor run poll failed: ${err}`, "API_ERROR", true);
    }

    const run = await response.json();
    const status = run.status as string;

    if (status === "FINISHED" || status === "COMPLETED") {
      return {
        status,
        text: run.text ?? run.result?.text,
        durationMs: run.durationMs,
      };
    }

    if (status === "FAILED" || status === "CANCELLED" || status === "ERROR") {
      throw new ProviderError(`Cursor run ${status}`, "API_ERROR", false);
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  throw new ProviderError("Cursor run timed out", "TIMEOUT", true);
}

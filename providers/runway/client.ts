import { basename } from "path";
import { readFile } from "fs/promises";
import { env } from "@/config/env";
import { ProviderError } from "@/providers/shared/errors";

const RUNWAY_API = "https://api.dev.runwayml.com";
const RUNWAY_VERSION = "2024-11-06";

export function getRunwayApiKey(): string | undefined {
  return env.VIDEO_API_KEY || env.RUNWAY_API_KEY;
}

export function isRunwayConfigured(): boolean {
  return Boolean(getRunwayApiKey());
}

export interface RunwayTask {
  id: string;
  status: string;
  output?: string[];
  failure?: string;
  failureCode?: string;
}

export function mapRunwayRatio(width: number, height: number): string {
  if (height > width * 1.2) return "720:1280";
  if (width > height * 1.2) return "1280:720";
  return "960:960";
}

export function clampRunwayDuration(seconds: number): number {
  return Math.min(10, Math.max(2, Math.round(seconds)));
}

export async function runwayRequest(
  apiKey: string,
  path: string,
  body: Record<string, unknown>,
): Promise<RunwayTask> {
  const response = await fetch(`${RUNWAY_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": RUNWAY_VERSION,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 429) throw new ProviderError("Runway rate limit", "RATE_LIMIT", true);
    if (response.status === 401) throw new ProviderError("Runway auth failed", "AUTH_ERROR", false);
    throw new ProviderError(`Runway error: ${err}`, "API_ERROR", response.status >= 500);
  }

  return response.json() as Promise<RunwayTask>;
}

export async function waitForRunwayTask(
  apiKey: string,
  taskId: string,
  timeoutMs = 600000,
): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const response = await fetch(`${RUNWAY_API}/v1/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Runway-Version": RUNWAY_VERSION,
      },
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new ProviderError(`Runway task poll failed: ${err}`, "API_ERROR", true);
    }

    const task = (await response.json()) as RunwayTask;

    if (task.status === "SUCCEEDED") {
      const url = task.output?.[0];
      if (!url) throw new ProviderError("Runway task succeeded without output", "API_ERROR", false);
      return url;
    }

    if (task.status === "FAILED" || task.status === "CANCELLED") {
      throw new ProviderError(
        task.failure || `Runway task ${task.status}`,
        task.failureCode || "API_ERROR",
        false,
      );
    }

    await new Promise((r) => setTimeout(r, 5000));
  }

  throw new ProviderError("Runway task timed out", "TIMEOUT", true);
}

export async function downloadRunwayOutput(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(300000) });
  if (!response.ok) {
    throw new ProviderError(`Failed to download Runway output: ${response.status}`, "API_ERROR", true);
  }
  return Buffer.from(await response.arrayBuffer());
}

interface UploadInitResponse {
  uploadUrl: string;
  fields: Record<string, string>;
  runwayUri?: string;
  id?: string;
}

function normalizeRunwayUri(data: UploadInitResponse): string {
  if (data.runwayUri) return data.runwayUri;
  if (data.id?.startsWith("runway://")) return data.id;
  if (data.id) return `runway://${data.id}`;
  throw new ProviderError("Runway upload response missing runway URI", "API_ERROR", false);
}

/** Upload a local file to Runway ephemeral storage and return a runway:// URI. */
export async function uploadEphemeralFile(apiKey: string, localPath: string): Promise<string> {
  const buffer = await readFile(localPath);
  return uploadEphemeralBuffer(apiKey, buffer, basename(localPath));
}

/** Upload bytes to Runway ephemeral storage and return a runway:// URI. */
export async function uploadEphemeralBuffer(
  apiKey: string,
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const initResponse = await fetch(`${RUNWAY_API}/v1/uploads`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Runway-Version": RUNWAY_VERSION,
    },
    body: JSON.stringify({ filename, type: "ephemeral" }),
    signal: AbortSignal.timeout(120000),
  });

  if (!initResponse.ok) {
    const err = await initResponse.text();
    if (initResponse.status === 401) throw new ProviderError("Runway auth failed", "AUTH_ERROR", false);
    throw new ProviderError(`Runway upload init failed: ${err}`, "API_ERROR", initResponse.status >= 500);
  }

  const data = (await initResponse.json()) as UploadInitResponse;
  const runwayUri = normalizeRunwayUri(data);

  const formData = new FormData();
  for (const [key, value] of Object.entries(data.fields)) {
    formData.append(key, value);
  }
  formData.append("file", new Blob([new Uint8Array(buffer)]), filename);

  const uploadResponse = await fetch(data.uploadUrl, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(300000),
  });

  if (!uploadResponse.ok) {
    const err = await uploadResponse.text();
    throw new ProviderError(`Runway file upload failed: ${err}`, "API_ERROR", true);
  }

  return runwayUri;
}

export async function getRunwayTask(apiKey: string, taskId: string): Promise<RunwayTask> {
  const response = await fetch(`${RUNWAY_API}/v1/tasks/${taskId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Runway-Version": RUNWAY_VERSION,
    },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new ProviderError(`Runway task poll failed: ${err}`, "API_ERROR", true);
  }

  return response.json() as Promise<RunwayTask>;
}

export function mapRunwayTaskProgress(status: string): number {
  switch (status) {
    case "PENDING":
      return 10;
    case "RUNNING":
      return 55;
    case "SUCCEEDED":
      return 100;
    case "FAILED":
    case "CANCELLED":
      return 0;
    default:
      return 25;
  }
}

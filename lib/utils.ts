import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
}

export function parseJsonSafe<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function repairJson(text: string): string {
  let repaired = text.trim();
  if (repaired.startsWith("```")) {
    repaired = repaired.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return repaired.trim();
}

export async function parseAiJson<T>(text: string, schema: { parse: (data: unknown) => T }): Promise<T> {
  const cleaned = repairJson(text);
  let parsed = parseJsonSafe<unknown>(cleaned);
  if (!parsed) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) parsed = parseJsonSafe(match[0]);
  }
  if (!parsed) throw new Error("Failed to parse AI JSON response");
  return schema.parse(parsed);
}

export function distributeDurations(totalSeconds: number, sceneCount: number): number[] {
  const base = Math.floor(totalSeconds / sceneCount);
  const remainder = totalSeconds - base * sceneCount;
  return Array.from({ length: sceneCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function sumDurations(durations: number[]): number {
  return durations.reduce((a, b) => a + b, 0);
}

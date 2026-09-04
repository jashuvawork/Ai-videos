import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, join } from "path";
import { getStorageBasePath } from "@/storage/paths";

export type Gen4TaskStatus = "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface Gen4TaskRecord {
  id: string;
  status: Gen4TaskStatus;
  progress: number;
  prompt: string;
  width: number;
  height: number;
  duration: number;
  provider: "studio";
  model: string;
  videoUrl?: string;
  failure?: string;
  createdAt: string;
  updatedAt: string;
}

function taskFilePath(taskId: string): string {
  return join(getStorageBasePath(), "gen4", "tasks", `${taskId}.json`);
}

export async function createGen4Task(
  record: Omit<Gen4TaskRecord, "createdAt" | "updatedAt">,
): Promise<Gen4TaskRecord> {
  const full: Gen4TaskRecord = {
    ...record,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const path = taskFilePath(record.id);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(full, null, 2), "utf8");
  return full;
}

export async function getGen4Task(taskId: string): Promise<Gen4TaskRecord | null> {
  try {
    const raw = await readFile(taskFilePath(taskId), "utf8");
    return JSON.parse(raw) as Gen4TaskRecord;
  } catch {
    return null;
  }
}

export async function updateGen4Task(
  taskId: string,
  patch: Partial<Pick<Gen4TaskRecord, "status" | "progress" | "videoUrl" | "failure" | "model">>,
): Promise<Gen4TaskRecord | null> {
  const existing = await getGen4Task(taskId);
  if (!existing) return null;

  const updated: Gen4TaskRecord = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  await writeFile(taskFilePath(taskId), JSON.stringify(updated, null, 2), "utf8");
  return updated;
}

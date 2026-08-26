import { env } from "@/config/env";
import type { StorageProvider } from "./types";
import { LocalStorageProvider } from "./local";

export function createStorageProvider(): StorageProvider {
  if (env.STORAGE_PROVIDER === "s3" && env.STORAGE_URL) {
    // S3 implementation placeholder - falls back to local for MVP
    console.warn("S3 storage configured but using local fallback in MVP");
  }
  return new LocalStorageProvider();
}

export const storage = createStorageProvider();

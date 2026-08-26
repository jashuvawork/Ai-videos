import { NextResponse } from "next/server";
import { getStorageBasePath } from "@/storage/paths";
import { env } from "@/config/env";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "ai-video-studio-backend",
    timestamp: new Date().toISOString(),
    storageBasePath: getStorageBasePath(),
    storageEnv: env.STORAGE_LOCAL_PATH,
    assetsBaseUrl: env.ASSETS_BASE_URL ?? null,
    buildTag: "edge-tts-fix-v1",
  });
}

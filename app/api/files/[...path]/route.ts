import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { env } from "@/config/env";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".srt": "text/plain",
  ".vtt": "text/vtt",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: pathSegments } = await params;
  const filePath = pathSegments.join("/");

  // Security: prevent path traversal
  if (filePath.includes("..") || filePath.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = join(process.cwd(), env.STORAGE_LOCAL_PATH, filePath);

  try {
    const buffer = await readFile(fullPath);
    const ext = "." + filePath.split(".").pop()?.toLowerCase();
    const mimeType = MIME_TYPES[ext] || "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=3600",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

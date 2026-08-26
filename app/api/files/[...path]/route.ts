import { NextResponse } from "next/server";
import { access, readFile } from "fs/promises";
import { join } from "path";
import { getStorageBasePath } from "@/storage/paths";
import { fetchRemoteAsset } from "@/lib/asset-url";

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".srt": "text/plain",
  ".vtt": "text/vtt",
};

function responseFromRemote(remote: Response, filePath: string) {
  const ext = "." + filePath.split(".").pop()?.toLowerCase();
  const mimeType =
    remote.headers.get("content-type") ||
    MIME_TYPES[ext] ||
    "application/octet-stream";

  return new NextResponse(remote.body, {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=3600",
      "Content-Length": remote.headers.get("content-length") ?? "",
    },
  });
}

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

  const basePath = getStorageBasePath();
  const fullPath = join(basePath, filePath);

  try {
    await access(fullPath);
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
    const remote = await fetchRemoteAsset(filePath);
    if (remote) {
      return responseFromRemote(remote, filePath);
    }
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

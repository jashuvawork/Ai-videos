import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { storage } from "@/storage";
import { analyzeGameplayFile } from "@/services/gameplay-analysis";

const MAX_BYTES = 500 * 1024 * 1024;
const ALLOWED = ["video/mp4", "video/quicktime", "video/webm"];

export async function GET() {
  const user = await getSessionUser();
  const clips = await prisma.gameplayClip.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ clips });
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    const formData = await request.formData();
    const file = formData.get("video");
    const assetRights = String(formData.get("assetRights") ?? "OWNED");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing video file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be under 500MB" }, { status: 400 });
    }

    const mime = file.type || "video/mp4";
    if (!ALLOWED.includes(mime) && !file.name.match(/\.(mp4|mov|webm)$/i)) {
      return NextResponse.json({ error: "Only MP4, MOV, WebM allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const clipId = `clip-${Date.now()}`;
    const storageKey = `gameplay/${user.id}/${clipId}.${ext}`;
    const stored = await storage.upload(buffer, storageKey, mime);

    const analysis = await analyzeGameplayFile(stored.localPath!, file.name);

    const clip = await prisma.gameplayClip.create({
      data: {
        userId: user.id,
        originalFilename: file.name,
        storageKey,
        mimeType: mime,
        duration: analysis.probe.duration,
        width: analysis.probe.width,
        height: analysis.probe.height,
        fps: analysis.probe.fps,
        status: "ready",
        metadata: { ...analysis.metadata, assetRights },
        tags: analysis.tags,
      },
    });

    return NextResponse.json({ clip }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { storage } from "@/storage";
import { ReferenceAnalysisService } from "@/services/reference-analysis";
import { ReferenceStyleProfileSchema } from "@/lib/schemas/reference-style";

const MAX_BYTES = 100 * 1024 * 1024; // 100MB

/**
 * Upload a reference video for STYLE analysis only — content is never copied.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("video");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing video file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Video must be under 100MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
    const assetPath = `projects/${id}/reference/reference-${Date.now()}.${ext}`;
    const stored = await storage.upload(buffer, assetPath, file.type || "video/mp4");

    const analyzer = new ReferenceAnalysisService();
    const profile = await analyzer.analyze(stored.localPath!);
    const validated = ReferenceStyleProfileSchema.parse(profile);

    const updated = await prisma.project.update({
      where: { id },
      data: {
        referenceVideoPath: stored.localPath,
        referenceStyleProfile: validated as object,
      },
    });

    return NextResponse.json({
      project: {
        id: updated.id,
        referenceVideoPath: updated.referenceVideoPath,
        referenceStyleProfile: validated,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze reference video";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

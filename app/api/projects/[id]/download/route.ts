import { NextResponse } from "next/server";
import { access, readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchRemoteAsset, resolveAssetUrl } from "@/lib/asset-url";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getSessionUser();

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { renders: { orderBy: { version: "desc" }, take: 1 } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const render = project.renders[0];
  if (!render?.localPath && !render?.videoUrl) {
    return NextResponse.json({ error: "No rendered video available" }, { status: 404 });
  }

  const filename = `${project.title || "video"}.mp4`;

  if (render.localPath) {
    try {
      await access(render.localPath);
      const buffer = await readFile(render.localPath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.length),
        },
      });
    } catch {
      // Fall through to remote fetch when files live on Railway worker disk
    }
  }

  if (render.videoUrl?.startsWith("/api/files/")) {
    const assetPath = render.videoUrl.replace(/^\/api\/files\//, "");
    const remote = await fetchRemoteAsset(assetPath);
    if (remote) {
      const buffer = await remote.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(buffer.byteLength),
        },
      });
    }
  }

  const remoteUrl = resolveAssetUrl(render.videoUrl);
  if (remoteUrl && remoteUrl !== render.videoUrl) {
    try {
      const remote = await fetch(remoteUrl, { cache: "no-store" });
      if (remote.ok) {
        const buffer = await remote.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": String(buffer.byteLength),
          },
        });
      }
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ error: "Video file not found" }, { status: 404 });
}

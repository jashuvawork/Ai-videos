import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { fetchRemoteAsset, resolveAssetUrl } from "@/lib/asset-url";
import { findReadableLocalPath } from "@/storage/paths";

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
  const assetPath = render.videoUrl?.startsWith("/api/files/")
    ? render.videoUrl.replace(/^\/api\/files\//, "")
    : `projects/${id}/renders/v${render.version}/final.mp4`;

  const localPath = await findReadableLocalPath(assetPath, [render.localPath ?? ""]);
  if (localPath) {
    const buffer = await readFile(localPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  }

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

  const remoteUrl = resolveAssetUrl(render.videoUrl);
  if (remoteUrl && remoteUrl !== render.videoUrl) {
    try {
      const remoteResponse = await fetch(remoteUrl, { cache: "no-store" });
      if (remoteResponse.ok) {
        const buffer = await remoteResponse.arrayBuffer();
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

  return NextResponse.json(
    {
      error: "Video file not found",
      hint:
        project.status === "COMPLETED"
          ? "The render may have been lost after a redeploy. Regenerate the project on Railway."
          : "Video is not ready yet or generation failed.",
    },
    { status: 404 },
  );
}

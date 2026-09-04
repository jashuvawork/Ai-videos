import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { withResolvedAssetUrls } from "@/lib/asset-url";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  const project = await prisma.project.findFirst({
    where: { id, userId: user.id, projectKind: "STORY_STUDIO" },
    include: {
      scenes: { orderBy: { sceneNumber: "asc" } },
      jobs: { orderBy: { createdAt: "desc" }, take: 5 },
      renders: { orderBy: { createdAt: "desc" }, take: 3 },
      socialMetadata: true,
      costEntries: true,
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json({ project: withResolvedAssetUrls(project) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  const { id } = await params;

  await prisma.project.deleteMany({
    where: { id, userId: user.id, projectKind: "STORY_STUDIO" },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { env } from "@/config/env";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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
  if (!render?.localPath) {
    return NextResponse.json({ error: "No rendered video available" }, { status: 404 });
  }

  try {
    const buffer = await readFile(render.localPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${project.title || "video"}.mp4"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return NextResponse.json({ error: "Video file not found" }, { status: 404 });
  }
}

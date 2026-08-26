import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { isRunwayConfigured } from "@/providers/runway/client";
import { Gen4VideoService } from "@/services/gen4-video";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!isRunwayConfigured()) {
      return NextResponse.json(
        { error: "Runway API key not configured", code: "RUNWAY_NOT_CONFIGURED" },
        { status: 503 },
      );
    }

    await getSessionUser();
    const { id } = await params;

    const service = new Gen4VideoService();
    const status = await service.getTaskStatus(id);

    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Gen-4 task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

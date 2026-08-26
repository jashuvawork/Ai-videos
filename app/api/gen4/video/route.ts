import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { Gen4VideoService } from "@/services/gen4-video";
import { initializeWorker } from "@/workers/worker";

const MAX_IMAGE_BYTES = 16 * 1024 * 1024;

const bodySchema = z.object({
  prompt: z.string().min(3).max(2000),
  duration: z.coerce.number().min(2).max(10).default(5),
  width: z.coerce.number().min(256).max(1920).default(1280),
  height: z.coerce.number().min(256).max(1920).default(720),
});

export async function POST(request: Request) {
  try {
    initializeWorker();
    await getSessionUser();

    const formData = await request.formData();
    const raw = {
      prompt: String(formData.get("prompt") ?? ""),
      duration: formData.get("duration"),
      width: formData.get("width"),
      height: formData.get("height"),
    };
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
    }

    const image = formData.get("image");
    let imageBuffer: Buffer | undefined;
    let imageFilename: string | undefined;

    if (image && image instanceof File && image.size > 0) {
      if (image.size > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: "Image must be under 16MB" }, { status: 400 });
      }
      imageBuffer = Buffer.from(await image.arrayBuffer());
      imageFilename = image.name || "reference.png";
    }

    const service = new Gen4VideoService();
    const result = await service.createTask({
      prompt: parsed.data.prompt,
      duration: parsed.data.duration,
      width: parsed.data.width,
      height: parsed.data.height,
      imageBuffer,
      imageFilename,
    });

    return NextResponse.json({
      taskId: result.taskId,
      provider: result.provider,
      model: result.model,
      status: "PENDING",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gen-4 generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

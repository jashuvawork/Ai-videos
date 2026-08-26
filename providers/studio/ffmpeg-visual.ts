import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { assertValidImageBuffer, detectImageFormat } from "./image-utils";
import { buildMotionFilterChain } from "./motion-engine";

const execFileAsync = promisify(execFile);

export function hashSeed(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 999999;
}

/** Valid 6-digit RGB hex for FFmpeg color=0xRRGGBB */
export function hashColorFromPrompt(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  const r = ((hash >> 16) & 0xff) + 40;
  const g = ((hash >> 8) & 0xff) + 40;
  const b = (hash & 0xff) + 40;
  const rr = Math.min(255, r).toString(16).padStart(2, "0");
  const gg = Math.min(255, g).toString(16).padStart(2, "0");
  const bb = Math.min(255, b).toString(16).padStart(2, "0");
  return `0x${rr}${gg}${bb}`;
}

export async function fetchPollinationsImage(
  prompt: string,
  width: number,
  height: number,
  seed?: number,
): Promise<Buffer> {
  const cappedW = Math.min(1280, Math.max(256, width));
  const cappedH = Math.min(1280, Math.max(256, height));
  const url = new URL("https://image.pollinations.ai/prompt/" + encodeURIComponent(prompt));
  url.searchParams.set("width", String(cappedW));
  url.searchParams.set("height", String(cappedH));
  url.searchParams.set("nologo", "true");
  url.searchParams.set("seed", String(seed ?? hashSeed(prompt)));

  const response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(120000),
    headers: { "User-Agent": "AI-Video-Studio/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Pollinations image failed: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json") || contentType.includes("text/html")) {
    throw new Error(`Pollinations returned non-image: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  assertValidImageBuffer(buffer, "Pollinations image");
  return buffer;
}

export async function loadImageBuffer(source: string): Promise<Buffer> {
  const { loadImageBuffer: load } = await import("./image-utils");
  return load(source);
}

export async function imageBufferToVideo(
  imageBuffer: Buffer,
  width: number,
  height: number,
  duration: number,
  fps = 30,
  cameraMovement = "slow zoom in",
): Promise<Buffer> {
  const safeDuration = Math.max(2, Math.min(duration, 12));
  const format = detectImageFormat(imageBuffer) ?? { ext: "png" };
  const inputPath = `/tmp/studio-img-${Date.now()}.${format.ext}`;
  const outputPath = `/tmp/studio-vid-${Date.now()}.mp4`;

  assertValidImageBuffer(imageBuffer, "imageBufferToVideo input");
  await writeFile(inputPath, imageBuffer);

  const totalFrames = Math.ceil(safeDuration * fps);
  const vf = buildMotionFilterChain(width, height, totalFrames, cameraMovement);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", inputPath,
      "-vf",
      vf,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-t", String(safeDuration),
      "-r", String(fps),
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/**
 * Crossfade two motion clips — simulates continued action when true AI video is unavailable.
 */
export async function dualImageBufferToVideo(
  imageA: Buffer,
  imageB: Buffer,
  width: number,
  height: number,
  duration: number,
  fps = 30,
  cameraMovement = "tracking lateral",
): Promise<Buffer> {
  const safeDuration = Math.max(3, Math.min(duration, 12));
  const fade = Math.min(0.35, safeDuration * 0.12);
  const half = safeDuration / 2;
  const clipAPath = `/tmp/studio-dual-a-${Date.now()}.mp4`;
  const clipBPath = `/tmp/studio-dual-b-${Date.now()}.mp4`;
  const outputPath = `/tmp/studio-dual-out-${Date.now()}.mp4`;

  const clipA = await imageBufferToVideo(imageA, width, height, half + fade / 2, fps, cameraMovement);
  const clipB = await imageBufferToVideo(
    imageB,
    width,
    height,
    half + fade / 2,
    fps,
    cameraMovement.includes("tracking") ? "tracking lateral" : cameraMovement,
  );

  await writeFile(clipAPath, clipA);
  await writeFile(clipBPath, clipB);

  const offset = Math.max(0.1, half - fade / 2);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", clipAPath,
      "-i", clipBPath,
      "-filter_complex",
      `[0:v][1:v]xfade=transition=fade:duration=${fade}:offset=${offset}[v]`,
      "-map", "[v]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-t", String(safeDuration),
      "-r", String(fps),
      outputPath,
    ]);
    return await readFile(outputPath);
  } finally {
    await unlink(clipAPath).catch(() => {});
    await unlink(clipBPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

/** Chain 2–4 motion clips with crossfades for Gen-4 style continuous action. */
export async function multiImageBufferToVideo(
  images: Buffer[],
  width: number,
  height: number,
  duration: number,
  fps = 30,
  cameraMovement = "tracking lateral",
): Promise<Buffer> {
  if (images.length === 0) {
    throw new Error("multiImageBufferToVideo requires at least one image");
  }
  if (images.length === 1) {
    return imageBufferToVideo(images[0], width, height, duration, fps, cameraMovement);
  }
  if (images.length === 2) {
    return dualImageBufferToVideo(images[0], images[1], width, height, duration, fps, cameraMovement);
  }

  const safeDuration = Math.max(3, Math.min(duration, 12));
  const n = images.length;
  const fade = Math.min(0.3, safeDuration * 0.08);
  const segment = safeDuration / n;

  const clipPaths: string[] = [];
  const outputPath = `/tmp/studio-multi-out-${Date.now()}.mp4`;

  try {
    for (let i = 0; i < n; i++) {
      const clipDuration = segment + fade / 2;
      const movement =
        i % 2 === 1 && cameraMovement.includes("tracking")
          ? "tracking lateral"
          : cameraMovement;
      const clipBuffer = await imageBufferToVideo(
        images[i],
        width,
        height,
        clipDuration,
        fps,
        movement,
      );
      const clipPath = `/tmp/studio-multi-${i}-${Date.now()}.mp4`;
      await writeFile(clipPath, clipBuffer);
      clipPaths.push(clipPath);
    }

    if (clipPaths.length === 2) {
      const offset = Math.max(0.1, segment - fade / 2);
      await execFileAsync("ffmpeg", [
        "-y",
        "-i", clipPaths[0],
        "-i", clipPaths[1],
        "-filter_complex",
        `[0:v][1:v]xfade=transition=fade:duration=${fade}:offset=${offset}[v]`,
        "-map", "[v]",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-t", String(safeDuration),
        "-r", String(fps),
        outputPath,
      ]);
      return await readFile(outputPath);
    }

    // 3+ clips: chain xfade filters
    const filterParts: string[] = [];
    let lastLabel = "0:v";
    let offset = Math.max(0.1, segment - fade / 2);

    for (let i = 1; i < clipPaths.length; i++) {
      const outLabel = i === clipPaths.length - 1 ? "v" : `v${i}`;
      filterParts.push(
        `[${lastLabel}][${i}:v]xfade=transition=fade:duration=${fade}:offset=${offset}[${outLabel}]`,
      );
      lastLabel = outLabel;
      offset += segment - fade / 2;
    }

    const inputArgs = clipPaths.flatMap((p) => ["-i", p]);
    await execFileAsync("ffmpeg", [
      "-y",
      ...inputArgs,
      "-filter_complex",
      filterParts.join(";"),
      "-map", "[v]",
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-t", String(safeDuration),
      "-r", String(fps),
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    for (const p of clipPaths) {
      await unlink(p).catch(() => {});
    }
    await unlink(outputPath).catch(() => {});
  }
}

export function detectImageFormatFromBuffer(buffer: Buffer) {
  return detectImageFormat(buffer);
}

/** Text-free fallback still — industrial tones, grain, vignette. Never embeds prompt text. */
export async function industrialPlaceholderImage(
  prompt: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const tmpPath = `/tmp/studio-placeholder-${Date.now()}.png`;
  const color = hashColorFromPrompt(prompt);
  const isProcess = /factory|conveyor|industrial|mixer|dough|biscuit|manufactur|production|stainless|oven|packaging/i.test(
    prompt,
  );
  const baseColor = isProcess ? "0x1a2228" : color;

  await execFileAsync("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${baseColor}:s=${width}x${height}:d=1`,
    "-vf",
    "vignette=angle=PI/4,noise=alls=12:allf=t+u,eq=brightness=-0.05:contrast=1.05",
    "-frames:v",
    "1",
    tmpPath,
  ]);

  const { readFile, unlink } = await import("fs/promises");
  const buffer = await readFile(tmpPath);
  await unlink(tmpPath).catch(() => {});
  return buffer;
}

/** @deprecated Use industrialPlaceholderImage — kept for callers migrating off text overlays */
export async function cinematicPlaceholderImage(
  prompt: string,
  width: number,
  height: number,
): Promise<Buffer> {
  return industrialPlaceholderImage(prompt, width, height);
}

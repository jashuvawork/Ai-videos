import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { assertValidImageBuffer, detectImageFormat } from "./image-utils";

const execFileAsync = promisify(execFile);

const CAMERA_MOVEMENTS: Record<string, string> = {
  "slow zoom in": "zoompan=z='min(zoom+0.001,1.3)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  "slow zoom out": "zoompan=z='if(lte(zoom,1.0),1.3,max(1.001,zoom-0.001))':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  "slow pan left": "zoompan=z='1.1':d=125:x='if(gte(on,1),x-1,x)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  "slow pan right": "zoompan=z='1.1':d=125:x='if(gte(on,1),x+1,x)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  "push in": "zoompan=z='min(zoom+0.002,1.4)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  "pull out": "zoompan=z='if(lte(zoom,1.0),1.4,max(1.001,zoom-0.002))':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  "vertical pan": "zoompan=z='1.1':d=125:x='iw/2-(iw/zoom/2)':y='if(gte(on,1),y-1,y)':s={w}x{h}",
};

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

function sanitizeDrawtext(text: string): string {
  return text
    .replace(/[':\\\n\r]/g, " ")
    .replace(/[^\w\s,.-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50);
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

  const movement = CAMERA_MOVEMENTS[cameraMovement] || CAMERA_MOVEMENTS["slow zoom in"];
  const totalFrames = Math.ceil(safeDuration * fps);
  const zoomFilter = movement
    .replace(/\{w\}/g, String(width))
    .replace(/\{h\}/g, String(height))
    .replace("d=125", `d=${totalFrames}`);

  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-loop", "1",
      "-i", inputPath,
      "-vf",
      `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},${zoomFilter}`,
      "-c:v", "libx264",
      "-pix_fmt", "yuv420p",
      "-t", String(safeDuration),
      "-r", String(fps),
      outputPath,
    ]);

    const { readFile } = await import("fs/promises");
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}

export function detectImageFormatFromBuffer(buffer: Buffer) {
  return detectImageFormat(buffer);
}

export async function cinematicPlaceholderImage(
  prompt: string,
  width: number,
  height: number,
): Promise<Buffer> {
  const tmpPath = `/tmp/studio-placeholder-${Date.now()}.png`;
  const color = hashColorFromPrompt(prompt);
  const label = sanitizeDrawtext(prompt);

  await execFileAsync("ffmpeg", [
    "-y",
    "-f", "lavfi",
    "-i", `color=c=${color}:s=${width}x${height}:d=1`,
    "-vf",
    `vignette,drawtext=text='${label}':fontsize=18:fontcolor=white@0.7:x=(w-text_w)/2:y=h-80`,
    "-frames:v", "1",
    tmpPath,
  ]);

  const { readFile, unlink } = await import("fs/promises");
  const buffer = await readFile(tmpPath);
  await unlink(tmpPath).catch(() => {});
  return buffer;
}

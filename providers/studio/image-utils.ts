import { readFile } from "fs/promises";

export type ImageFormat = { mime: string; ext: string };

/** Detect common raster image formats from magic bytes. */
export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return { mime: "image/png", ext: "png" };
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return { mime: "image/gif", ext: "gif" };
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

export function assertValidImageBuffer(buffer: Buffer, context: string): void {
  const format = detectImageFormat(buffer);
  if (!format) {
    const preview = buffer.subarray(0, 32).toString("utf8").replace(/\s+/g, " ").slice(0, 40);
    throw new Error(
      `${context}: expected image bytes, got ${buffer.length} bytes starting with "${preview}"`,
    );
  }
}

export async function loadImageBuffer(source: string): Promise<Buffer> {
  let buffer: Buffer;
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const response = await fetch(source, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json") || contentType.includes("text/")) {
      throw new Error(`Image URL returned non-image content-type: ${contentType}`);
    }
    buffer = Buffer.from(await response.arrayBuffer());
  } else {
    buffer = await readFile(source);
  }

  assertValidImageBuffer(buffer, `Image source ${source}`);
  return buffer;
}

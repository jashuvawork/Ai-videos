import { execFile } from "child_process";
import { promisify } from "util";
import { basename } from "path";

const execFileAsync = promisify(execFile);

export interface GameplayProbeResult {
  duration: number;
  width: number;
  height: number;
  fps: number;
}

export interface GameplayAnalysisResult {
  probe: GameplayProbeResult;
  metadata: Record<string, unknown>;
  tags: string[];
}

const TAG_KEYWORDS: Record<string, string[]> = {
  taxi: ["taxi", "cab", "uber"],
  car: ["car", "drive", "driving", "vehicle", "highway", "road"],
  chase: ["chase", "pursuit", "flee", "escape", "run"],
  night: ["night", "dark", "midnight", "evening"],
  rain: ["rain", "storm", "wet", "thunder"],
  city: ["city", "downtown", "urban", "street", "los", "santos"],
  police: ["police", "cop", "siren", "wanted"],
  action: ["action", "shoot", "fight", "crash", "explosion"],
  interior: ["interior", "inside", "cabin", "room"],
  beach: ["beach", "ocean", "coast", "pier"],
  desert: ["desert", "sand", "outback"],
  mountain: ["mountain", "hill", "cliff"],
};

export async function probeVideoFile(filePath: string): Promise<GameplayProbeResult> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "format=duration:stream=width,height,r_frame_rate",
    "-of",
    "json",
    filePath,
  ]);

  const probe = JSON.parse(stdout);
  const stream = probe.streams?.[0] ?? {};
  let fps = 30;
  if (stream.r_frame_rate) {
    const [n, d] = String(stream.r_frame_rate).split("/").map(Number);
    fps = d ? n / d : n;
  }

  return {
    duration: parseFloat(probe.format?.duration || "0"),
    width: stream.width ?? 0,
    height: stream.height ?? 0,
    fps,
  };
}

export function inferTagsFromFilename(filename: string): string[] {
  const base = basename(filename).toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const tags = new Set<string>();

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((k) => base.includes(k))) tags.add(tag);
  }

  for (const word of base.split(/\s+/).filter((w) => w.length > 3)) {
    tags.add(word);
  }

  return [...tags];
}

export function inferMetadata(tags: string[]): Record<string, unknown> {
  const mood =
    tags.includes("chase") || tags.includes("police")
      ? "suspense"
      : tags.includes("night")
        ? "dark"
        : "neutral";

  return {
    location: tags.includes("city") ? "city" : tags.includes("desert") ? "desert" : "unknown",
    timeOfDay: tags.includes("night") ? "night" : "day",
    weather: tags.includes("rain") ? "rain" : "clear",
    action: tags.filter((t) => ["driving", "chase", "fight", "crash"].includes(t) || t === "car"),
    camera: "third_person",
    mood,
    visualStyle: "gameplay",
  };
}

export async function analyzeGameplayFile(
  filePath: string,
  filename: string,
): Promise<GameplayAnalysisResult> {
  const probe = await probeVideoFile(filePath);
  const tags = inferTagsFromFilename(filename);
  const metadata = inferMetadata(tags);

  return { probe, metadata, tags };
}

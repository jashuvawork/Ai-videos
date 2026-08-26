import { execFile } from "child_process";
import { promisify } from "util";
import type { MusicProvider, MusicGenerateOptions, MusicResponse } from "./types";

const execFileAsync = promisify(execFile);

/** Layered ambient score — no external music API. */
export class StudioMusicProvider implements MusicProvider {
  readonly name = "studio";

  async generate(options: MusicGenerateOptions): Promise<MusicResponse> {
    const duration = options.duration;
    const tmpPath = `/tmp/studio-music-${Date.now()}.mp3`;
    const base = moodToFreq(options.mood);
    const harmony = base * 1.25;

    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `sine=frequency=${base}:duration=${duration}`,
      "-f", "lavfi",
      "-i", `sine=frequency=${harmony}:duration=${duration}`,
      "-filter_complex",
      `[0:a][1:a]amix=inputs=2:duration=longest,volume=0.12,aecho=0.8:0.88:1200:0.35[out]`,
      "-map", "[out]",
      "-c:a", "libmp3lame",
      "-b:a", "192k",
      tmpPath,
    ]);

    const { readFile, unlink } = await import("fs/promises");
    const audioBuffer = await readFile(tmpPath);
    await unlink(tmpPath).catch(() => {});

    return {
      audioBuffer,
      provider: this.name,
      duration,
      mood: options.mood,
      cost: 0,
      isMock: false,
    };
  }
}

function moodToFreq(mood: string): number {
  const m = mood.toLowerCase();
  if (m.includes("dark") || m.includes("suspense")) return 98;
  if (m.includes("energetic")) return 330;
  if (m.includes("emotional") || m.includes("cinematic")) return 196;
  if (m.includes("calm")) return 147;
  return 174;
}

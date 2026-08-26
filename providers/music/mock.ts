import { execFile } from "child_process";
import { promisify } from "util";
import type { MusicProvider, MusicGenerateOptions, MusicResponse } from "./types";

const execFileAsync = promisify(execFile);

export class MockMusicProvider implements MusicProvider {
  readonly name = "mock";

  async generate(options: MusicGenerateOptions): Promise<MusicResponse> {
    const duration = options.duration;
    const tmpPath = `/tmp/mock-music-${Date.now()}.mp3`;
    const bpm = options.bpm || 80;
    const freq = moodToFreq(options.mood);

    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `sine=frequency=${freq}:duration=${duration}`,
      "-af", `volume=0.15,aecho=0.8:0.9:1000:0.3`,
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
      cost: 0.03,
      isMock: true,
    };
  }
}

function moodToFreq(mood: string): number {
  const m = mood.toLowerCase();
  if (m.includes("dark") || m.includes("suspense")) return 110;
  if (m.includes("energetic")) return 440;
  if (m.includes("emotional") || m.includes("cinematic")) return 220;
  if (m.includes("calm")) return 165;
  return 196;
}

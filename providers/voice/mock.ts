import { execFile } from "child_process";
import { promisify } from "util";
import type { VoiceProvider, VoiceGenerateOptions, VoiceResponse } from "./types";

const execFileAsync = promisify(execFile);

export class MockVoiceProvider implements VoiceProvider {
  readonly name = "mock";

  async generate(options: VoiceGenerateOptions): Promise<VoiceResponse> {
    const wordCount = options.text.split(/\s+/).length;
    const duration = Math.max(1.5, (wordCount / 2.5) / (options.speed || 1));
    const tmpPath = `/tmp/mock-voice-${Date.now()}.mp3`;
    const freq = options.voice === "female" ? 300 : options.voice === "male" ? 200 : 250;

    // Generate a subtle tone as placeholder audio with correct duration
    await execFileAsync("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `sine=frequency=${freq}:duration=${duration}`,
      "-af", "volume=0.1",
      "-c:a", "libmp3lame",
      "-b:a", "128k",
      tmpPath,
    ]);

    const words = options.text.split(/\s+/);
    const wordDuration = duration / words.length;
    const wordTimings = words.map((word, i) => ({
      word,
      start: i * wordDuration,
      end: (i + 1) * wordDuration,
    }));

    const { readFile, unlink } = await import("fs/promises");
    const audioBuffer = await readFile(tmpPath);
    await unlink(tmpPath).catch(() => {});

    return {
      audioBuffer,
      provider: this.name,
      duration,
      voice: options.voice,
      language: options.language,
      wordTimings,
      cost: 0.005,
      isMock: true,
    };
  }
}

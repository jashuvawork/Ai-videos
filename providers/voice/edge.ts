import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "child_process";
import { promisify } from "util";
import { access, readFile, unlink, writeFile } from "fs/promises";
import { EdgeTTS } from "node-edge-tts";
import { env } from "@/config/env";
import { videoLog } from "@/lib/logger";
import { ProviderError } from "@/providers/shared/errors";
import { MockVoiceProvider } from "@/providers/voice/mock";
import type { VoiceProvider, VoiceGenerateOptions, VoiceResponse } from "./types";

const execFileAsync = promisify(execFile);

const VOICE_MAP: Record<string, { voice: string; lang: string }> = {
  male: { voice: "en-US-GuyNeural", lang: "en-US" },
  female: { voice: "en-US-JennyNeural", lang: "en-US" },
  neutral: { voice: "en-US-AriaNeural", lang: "en-US" },
};

function uniqueTempPath(prefix: string, ext: string): string {
  return join(tmpdir(), `${prefix}-${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`);
}

/**
 * Free natural TTS via Microsoft Edge voices — no API key required.
 * Falls back to FFmpeg tone narration when Edge is unreachable (common on cloud hosts).
 */
export class EdgeVoiceProvider implements VoiceProvider {
  readonly name = "edge";
  private mockFallback = new MockVoiceProvider();

  async generate(options: VoiceGenerateOptions): Promise<VoiceResponse> {
    const voiceKey = options.voice.toLowerCase();
    const voiceConfig = VOICE_MAP[voiceKey] || VOICE_MAP.male;
    const tmpPath = uniqueTempPath("edge-voice", "mp3");

    try {
      const tts = new EdgeTTS({
        voice: voiceConfig.voice,
        lang: voiceConfig.lang,
        outputFormat: "audio-24khz-96kbitrate-mono-mp3",
        rate: options.speed && options.speed > 1 ? "+10%" : "default",
        timeout: 90000,
      });

      await tts.ttsPromise(options.text, tmpPath);
      await access(tmpPath);

      const audioBuffer = await readFile(tmpPath);
      if (audioBuffer.length < 128) {
        throw new Error(`Edge TTS produced empty audio (${audioBuffer.length} bytes)`);
      }

      const duration = await probeAudioDuration(audioBuffer);
      const words = options.text.split(/\s+/).filter(Boolean);
      const wordDuration = duration / Math.max(words.length, 1);
      const wordTimings = words.map((word, i) => ({
        word,
        start: i * wordDuration,
        end: (i + 1) * wordDuration,
      }));

      return {
        audioBuffer,
        provider: this.name,
        duration,
        voice: options.voice,
        language: options.language,
        wordTimings,
        cost: 0,
        isMock: false,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      videoLog("Edge TTS failed", { error: message, operation: "EDGE_TTS" }, "warn");

      if (env.STUDIO_ALLOW_VOICE_FALLBACK === "false") {
        throw new ProviderError(`Edge TTS failed: ${message}`, "API_ERROR", true);
      }

      const fallback = await this.mockFallback.generate(options);
      return {
        ...fallback,
        provider: "edge+fallback",
        isMock: true,
      };
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }
}

async function probeAudioDuration(buffer: Buffer): Promise<number> {
  const tmpPath = uniqueTempPath("edge-probe", "mp3");
  await writeFile(tmpPath, buffer);
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      tmpPath,
    ]);
    const parsed = parseFloat(stdout.trim());
    return Number.isFinite(parsed) ? parsed : Math.max(1.5, buffer.length / 16000);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
}

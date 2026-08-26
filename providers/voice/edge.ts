import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, readFile } from "fs/promises";
import { EdgeTTS } from "node-edge-tts";
import { ProviderError } from "@/providers/shared/errors";
import type { VoiceProvider, VoiceGenerateOptions, VoiceResponse } from "./types";

const execFileAsync = promisify(execFile);

const VOICE_MAP: Record<string, { voice: string; lang: string }> = {
  male: { voice: "en-US-GuyNeural", lang: "en-US" },
  female: { voice: "en-US-JennyNeural", lang: "en-US" },
  neutral: { voice: "en-US-AriaNeural", lang: "en-US" },
};

/**
 * Free natural TTS via Microsoft Edge voices — no API key required.
 */
export class EdgeVoiceProvider implements VoiceProvider {
  readonly name = "edge";

  async generate(options: VoiceGenerateOptions): Promise<VoiceResponse> {
    const voiceKey = options.voice.toLowerCase();
    const voiceConfig = VOICE_MAP[voiceKey] || VOICE_MAP.male;
    const tmpPath = `/tmp/edge-voice-${Date.now()}.mp3`;

    try {
      const tts = new EdgeTTS({
        voice: voiceConfig.voice,
        lang: voiceConfig.lang,
        outputFormat: "audio-24khz-96kbitrate-mono-mp3",
        rate: options.speed && options.speed > 1 ? "+10%" : "default",
        timeout: 60000,
      });

      await tts.ttsPromise(options.text, tmpPath);
      const audioBuffer = await readFile(tmpPath);

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
      throw new ProviderError(`Edge TTS failed: ${String(error)}`, "API_ERROR", true);
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  }
}

async function probeAudioDuration(buffer: Buffer): Promise<number> {
  const tmpPath = `/tmp/edge-probe-${Date.now()}.mp3`;
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

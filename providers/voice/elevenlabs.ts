import { execFile } from "child_process";
import { promisify } from "util";
import { env } from "@/config/env";
import { ProviderError } from "@/providers/shared/errors";
import type { VoiceProvider, VoiceGenerateOptions, VoiceResponse } from "./types";

const execFileAsync = promisify(execFile);

const VOICE_IDS: Record<string, string> = {
  male: "pNInz6obpgDQGcFmaJgB", // Adam
  female: "21m00Tcm4TlvDq8ikWAM", // Rachel
  neutral: "EXAVITQu4vr4xnSDxMaL", // Bella
};

export class ElevenLabsVoiceProvider implements VoiceProvider {
  readonly name = "elevenlabs";

  async generate(options: VoiceGenerateOptions): Promise<VoiceResponse> {
    const apiKey = env.VOICE_API_KEY || env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new ProviderError("ElevenLabs API key not configured", "AUTH_ERROR", false);

    const voiceId = VOICE_IDS[options.voice] || VOICE_IDS.male;

    const stability = options.emotion?.match(/fear|tension|panic/i)
      ? 0.35
      : options.emotion?.match(/calm|resolution|contemplative/i)
        ? 0.65
        : 0.45;
    const style = options.emotion?.match(/dramatic|shock|reveal/i) ? 0.5 : 0.35;

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: options.text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability,
          similarity_boost: 0.8,
          style,
          use_speaker_boost: true,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const err = await response.text();
      if (response.status === 429) throw new ProviderError("ElevenLabs rate limit", "RATE_LIMIT", true);
      if (response.status === 401) throw new ProviderError("ElevenLabs auth failed", "AUTH_ERROR", false);
      throw new ProviderError(`ElevenLabs error: ${err}`, "API_ERROR", response.status >= 500);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
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
      cost: (options.text.length / 1000) * 0.18,
      isMock: false,
    };
  }
}

async function probeAudioDuration(buffer: Buffer): Promise<number> {
  const tmpPath = `/tmp/el-audio-${Date.now()}.mp3`;
  const { writeFile, unlink } = await import("fs/promises");
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

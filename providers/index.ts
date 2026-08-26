import { env } from "@/config/env";
import type { LLMProvider } from "@/providers/llm/types";
import type { ImageProvider } from "@/providers/image/types";
import type { VideoProvider } from "@/providers/video/types";
import type { VoiceProvider } from "@/providers/voice/types";
import type { MusicProvider } from "@/providers/music/types";
import { createLLMProvider } from "@/providers/llm/openai";
import { MockImageProvider } from "@/providers/image/mock";
import { MockVideoProvider } from "@/providers/video/mock";
import { MockVoiceProvider } from "@/providers/voice/mock";
import { MockMusicProvider } from "@/providers/music/mock";

export interface ProviderBundle {
  llm: LLMProvider;
  image: ImageProvider;
  video: VideoProvider;
  voice: VoiceProvider;
  music: MusicProvider;
}

export function createProviders(): ProviderBundle {
  return {
    llm: createLLMProvider(),
    image: createImageProvider(),
    video: createVideoProvider(),
    voice: createVoiceProvider(),
    music: createMusicProvider(),
  };
}

function createImageProvider(): ImageProvider {
  // Future: stability, dalle, etc.
  return new MockImageProvider();
}

function createVideoProvider(): VideoProvider {
  // Future: runway, pika, etc.
  return new MockVideoProvider();
}

function createVoiceProvider(): VoiceProvider {
  // Future: elevenlabs, etc.
  return new MockVoiceProvider();
}

function createMusicProvider(): MusicProvider {
  return new MockMusicProvider();
}

export function isMockMode(): boolean {
  return env.AI_TEXT_PROVIDER === "mock" || !env.LLM_API_KEY;
}

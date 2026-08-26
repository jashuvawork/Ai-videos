import { env } from "@/config/env";
import type { LLMProvider } from "@/providers/llm/types";
import type { ImageProvider } from "@/providers/image/types";
import type { VideoProvider } from "@/providers/video/types";
import type { VoiceProvider } from "@/providers/voice/types";
import type { MusicProvider } from "@/providers/music/types";
import { createLLMProvider } from "@/providers/llm/openai";
import { DalleImageProvider } from "@/providers/image/dalle";
import { MockImageProvider } from "@/providers/image/mock";
import { RunwayVideoProvider } from "@/providers/video/runway";
import { MockVideoProvider } from "@/providers/video/mock";
import { ElevenLabsVoiceProvider } from "@/providers/voice/elevenlabs";
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
  const provider = env.AI_IMAGE_PROVIDER;
  if (provider === "dalle" || provider === "openai") {
    if (env.OPENAI_API_KEY || env.IMAGE_API_KEY || env.LLM_API_KEY) {
      return new DalleImageProvider();
    }
  }
  return new MockImageProvider();
}

function createVideoProvider(): VideoProvider {
  const provider = env.AI_VIDEO_PROVIDER;
  if (provider === "runway" && (env.VIDEO_API_KEY || env.RUNWAY_API_KEY)) {
    return new RunwayVideoProvider();
  }
  return new MockVideoProvider();
}

function createVoiceProvider(): VoiceProvider {
  const provider = env.AI_VOICE_PROVIDER;
  if (provider === "elevenlabs" && (env.VOICE_API_KEY || env.ELEVENLABS_API_KEY)) {
    return new ElevenLabsVoiceProvider();
  }
  return new MockVoiceProvider();
}

function createMusicProvider(): MusicProvider {
  return new MockMusicProvider();
}

export function isMockMode(): boolean {
  const providers = createProviders();
  return (
    providers.llm.name === "mock" ||
    providers.image.name === "mock" ||
    providers.video.name === "mock" ||
    providers.voice.name === "mock"
  );
}

export function getActiveProviderNames() {
  const providers = createProviders();
  return {
    llm: providers.llm.name,
    image: providers.image.name,
    video: providers.video.name,
    voice: providers.voice.name,
    music: providers.music.name,
    realistic: !isMockMode(),
  };
}

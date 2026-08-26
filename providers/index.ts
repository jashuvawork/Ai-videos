import { env } from "@/config/env";
import type { LLMProvider } from "@/providers/llm/types";
import type { ImageProvider } from "@/providers/image/types";
import type { VideoProvider } from "@/providers/video/types";
import type { VoiceProvider } from "@/providers/voice/types";
import type { MusicProvider } from "@/providers/music/types";
import { createLLMProvider as createOpenAILLMProvider } from "@/providers/llm/openai";
import { StudioLLMProvider } from "@/providers/llm/studio";
import { CursorLLMProvider } from "@/providers/llm/cursor";
import { MockLLMProvider } from "@/providers/llm/mock";
import { DalleImageProvider } from "@/providers/image/dalle";
import { StudioImageProvider } from "@/providers/image/studio";
import { MockImageProvider } from "@/providers/image/mock";
import { RunwayVideoProvider } from "@/providers/video/runway";
import { StudioVideoProvider } from "@/providers/video/studio";
import { MockVideoProvider } from "@/providers/video/mock";
import { ElevenLabsVoiceProvider } from "@/providers/voice/elevenlabs";
import { EdgeVoiceProvider } from "@/providers/voice/edge";
import { MockVoiceProvider } from "@/providers/voice/mock";
import { StudioMusicProvider } from "@/providers/music/studio";
import { MockMusicProvider } from "@/providers/music/mock";
import { getCursorApiKey, verifyCursorApiKey } from "@/providers/cursor/client";
import { isRunwayConfigured } from "@/providers/runway/client";

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

function createLLMProvider(): LLMProvider {
  const provider = env.AI_TEXT_PROVIDER;
  if (provider === "cursor" && getCursorApiKey()) {
    return new CursorLLMProvider();
  }
  if (provider === "openai" && (env.OPENAI_API_KEY || env.LLM_API_KEY)) {
    return createOpenAILLMProvider();
  }
  if (provider === "studio" || provider === "builtin" || provider === "local") {
    return new StudioLLMProvider();
  }
  if (provider === "mock") {
    return new MockLLMProvider();
  }
  // Default: built-in studio (no API keys)
  return new StudioLLMProvider();
}

function createImageProvider(): ImageProvider {
  const provider = env.AI_IMAGE_PROVIDER;
  if (provider === "dalle" || provider === "openai") {
    if (env.OPENAI_API_KEY || env.IMAGE_API_KEY || env.LLM_API_KEY) {
      return new DalleImageProvider();
    }
  }
  if (provider === "studio" || provider === "builtin" || provider === "local" || provider === "pollinations") {
    return new StudioImageProvider();
  }
  if (provider === "mock") {
    return new MockImageProvider();
  }
  return new StudioImageProvider();
}

function createVideoProvider(): VideoProvider {
  const provider = env.AI_VIDEO_PROVIDER;
  if (provider === "runway" && isRunwayConfigured()) {
    return new RunwayVideoProvider();
  }
  if (provider === "studio" || provider === "builtin" || provider === "local" || provider === "ffmpeg") {
    return new StudioVideoProvider();
  }
  if (provider === "mock") {
    return new MockVideoProvider();
  }
  return new StudioVideoProvider();
}

function createVoiceProvider(): VoiceProvider {
  const provider = env.AI_VOICE_PROVIDER;
  if (provider === "elevenlabs" && (env.VOICE_API_KEY || env.ELEVENLABS_API_KEY)) {
    return new ElevenLabsVoiceProvider();
  }
  if (provider === "edge" || provider === "studio" || provider === "builtin" || provider === "local") {
    return new EdgeVoiceProvider();
  }
  if (provider === "mock") {
    return new MockVoiceProvider();
  }
  return new EdgeVoiceProvider();
}

function createMusicProvider(): MusicProvider {
  const provider = env.AI_MUSIC_PROVIDER;
  if (provider === "studio" || provider === "builtin" || provider === "local") {
    return new StudioMusicProvider();
  }
  if (provider === "mock") {
    return new MockMusicProvider();
  }
  return new StudioMusicProvider();
}

export function isMockMode(): boolean {
  const providers = createProviders();
  return providers.image.name === "mock" || providers.video.name === "mock";
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
    zeroApiKeys: providers.llm.name === "studio" && providers.image.name === "studio",
    cursorApiKeyConfigured: Boolean(getCursorApiKey()),
  };
}

export async function getProviderStatus() {
  const active = getActiveProviderNames();
  const cursorValid = active.cursorApiKeyConfigured ? await verifyCursorApiKey() : false;
  return {
    ...active,
    cursorApiKeyValid: cursorValid,
    runwayApiKeyConfigured: isRunwayConfigured(),
    gen4Available: isRunwayConfigured(),
  };
}

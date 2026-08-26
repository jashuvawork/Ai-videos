import type { AspectRatio, Platform } from "@/lib/generated/prisma/client";

export const EXPORT_PRESETS = {
  INSTAGRAM_REEL: { width: 1080, height: 1920, aspectRatio: "9:16" as const },
  YOUTUBE_SHORT: { width: 1080, height: 1920, aspectRatio: "9:16" as const },
  YOUTUBE: { width: 1920, height: 1080, aspectRatio: "16:9" as const },
  TIKTOK: { width: 1080, height: 1920, aspectRatio: "9:16" as const },
  SQUARE: { width: 1080, height: 1080, aspectRatio: "1:1" as const },
} as const;

export function getResolution(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case "RATIO_9_16":
      return { width: 1080, height: 1920 };
    case "RATIO_16_9":
      return { width: 1920, height: 1080 };
    case "RATIO_1_1":
      return { width: 1080, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
}

export function platformToPreset(platform: Platform) {
  switch (platform) {
    case "INSTAGRAM_REEL":
      return EXPORT_PRESETS.INSTAGRAM_REEL;
    case "YOUTUBE_SHORT":
      return EXPORT_PRESETS.YOUTUBE_SHORT;
    case "YOUTUBE":
      return EXPORT_PRESETS.YOUTUBE;
    case "TIKTOK":
      return EXPORT_PRESETS.TIKTOK;
    default:
      return EXPORT_PRESETS.INSTAGRAM_REEL;
  }
}

export const BITRATE_PRESETS = {
  low: "2M",
  medium: "4M",
  high: "8M",
} as const;

export const MUSIC_DUCK_VOLUME = 0.2;
export const NARRATION_VOLUME = 1.0;
export const SFX_DEFAULT_VOLUME = 0.6;

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
] as const;

export const JOB_STEPS = [
  "CREATE_SCRIPT",
  "CREATE_CHARACTER_BIBLE",
  "CREATE_SCENES",
  "GENERATE_VISUALS",
  "GENERATE_VOICE",
  "GENERATE_MUSIC",
  "GENERATE_SFX",
  "GENERATE_SUBTITLES",
  "BUILD_TIMELINE",
  "RENDER_VIDEO",
  "GENERATE_THUMBNAIL",
  "GENERATE_METADATA",
  "COMPLETE",
] as const;

export const STEP_LABELS: Record<string, string> = {
  CREATE_SCRIPT: "Understanding your idea",
  CREATE_CHARACTER_BIBLE: "Creating characters",
  CREATE_SCENES: "Planning scenes",
  GENERATE_VISUALS: "Generating visuals",
  GENERATE_VOICE: "Creating voiceover",
  GENERATE_MUSIC: "Adding music",
  GENERATE_SFX: "Adding sound effects",
  GENERATE_SUBTITLES: "Creating captions",
  BUILD_TIMELINE: "Building timeline",
  RENDER_VIDEO: "Rendering video",
  GENERATE_THUMBNAIL: "Creating thumbnail",
  GENERATE_METADATA: "Finalizing metadata",
  COMPLETE: "Complete",
};

import { MUSIC_DUCK_VOLUME, NARRATION_VOLUME } from "@/config/video";

export interface TimelineScene {
  id: string;
  sceneNumber: number;
  duration: number;
  narrationDuration?: number;
  startTime: number;
  endTime: number;
  adjustedDuration: number;
}

export interface AudioTimeline {
  scenes: TimelineScene[];
  totalDuration: number;
  musicVolume: number;
  narrationVolume: number;
  sfx: Array<{
    name: string;
    startTime: number;
    duration: number;
    volume: number;
    fadeIn: number;
    fadeOut: number;
  }>;
}

export class AudioTimelineService {
  buildTimeline(
    scenes: Array<{
      id: string;
      sceneNumber: number;
      duration: number;
      narrationDuration?: number;
      soundEffects?: unknown;
    }>,
  ): AudioTimeline {
    const timelineScenes: TimelineScene[] = [];
    let currentTime = 0;
    const sfx: AudioTimeline["sfx"] = [];

    for (const scene of scenes) {
      let adjustedDuration = scene.duration;

      if (scene.narrationDuration) {
        if (scene.narrationDuration > scene.duration) {
          // Extend scene to fit narration with small hold
          adjustedDuration = scene.narrationDuration + 0.3;
        } else if (scene.narrationDuration < scene.duration - 1) {
          // Keep visual hold after narration ends
          adjustedDuration = scene.duration;
        }
      }

      timelineScenes.push({
        id: scene.id,
        sceneNumber: scene.sceneNumber,
        duration: scene.duration,
        narrationDuration: scene.narrationDuration,
        startTime: currentTime,
        endTime: currentTime + adjustedDuration,
        adjustedDuration,
      });

      const effects = parseSoundEffects(scene.soundEffects);
      for (const effect of effects) {
        sfx.push({
          name: effect,
          startTime: currentTime,
          duration: Math.min(adjustedDuration, 3),
          volume: 0.5,
          fadeIn: 0.2,
          fadeOut: 0.3,
        });
      }

      currentTime += adjustedDuration;
    }

    return {
      scenes: timelineScenes,
      totalDuration: currentTime,
      musicVolume: MUSIC_DUCK_VOLUME,
      narrationVolume: NARRATION_VOLUME,
      sfx,
    };
  }

  calculateNarrationSpeed(text: string, targetDuration: number): number {
    const wordCount = text.split(/\s+/).length;
    const naturalDuration = wordCount / 2.5;
    if (naturalDuration <= targetDuration) return 1.0;
    const speed = naturalDuration / targetDuration;
    return Math.min(speed, 1.5);
  }
}

function parseSoundEffects(effects: unknown): string[] {
  if (!effects) return [];
  if (Array.isArray(effects)) return effects.filter((e) => typeof e === "string");
  return [];
}

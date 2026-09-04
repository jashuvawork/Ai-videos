import { VideoQAService } from "@/services/video-qa";
import type { StoryPlan } from "@/lib/story-studio/schemas";

export interface StudioQCResult {
  overallScore: number;
  hook: number;
  story: number;
  visuals: number;
  voice: number;
  audioMix: number;
  pacing: number;
  subtitleQuality: number;
  issues: string[];
  warnings: string[];
  valid: boolean;
}

export class StudioQCService {
  private videoQA = new VideoQAService();

  async analyze(
    videoPath: string,
    plan: StoryPlan,
    options: {
      hasVoice: boolean;
      hasSubtitles: boolean;
      sceneCount: number;
    },
  ): Promise<StudioQCResult> {
    const qa = await this.videoQA.analyze(videoPath);
    const issues = [...qa.issues];
    const warnings = [...qa.warnings];

    const hookScene = plan.scenes[0];
    const hook = hookScene?.duration <= 8 && hookScene?.narration ? 9.0 : 7.5;
    const story = plan.scenes.length >= 8 ? 8.8 : 7.2;
    const visuals = qa.valid
      ? Math.max(6, 10 - (qa.frozenFrameRatio ?? 0) * 5 - (qa.blackFrameRatio ?? 0) * 3)
      : 5.5;
    const voice = options.hasVoice ? 9.0 : 4.0;
    const audioMix = qa.hasAudio ? 8.7 : 5.0;
    const pacing = plan.scenes.every((s) => s.duration >= 3 && s.duration <= 20) ? 8.5 : 7.0;
    const subtitleQuality = options.hasSubtitles ? 9.2 : 6.0;

    if (!options.hasVoice) issues.push("No narration audio detected");
    if (plan.scenes.filter((s) => s.aiVideoRequired).length > plan.scenes.length * 0.6) {
      warnings.push("High ratio of AI shots — consider more gameplay");
    }

    const overallScore =
      (hook + story + visuals + voice + audioMix + pacing + subtitleQuality) / 7;

    return {
      overallScore: Math.round(overallScore * 10) / 10,
      hook: Math.round(hook * 10) / 10,
      story: Math.round(story * 10) / 10,
      visuals: Math.round(visuals * 10) / 10,
      voice: Math.round(voice * 10) / 10,
      audioMix: Math.round(audioMix * 10) / 10,
      pacing: Math.round(pacing * 10) / 10,
      subtitleQuality: Math.round(subtitleQuality * 10) / 10,
      issues,
      warnings,
      valid: qa.valid && overallScore >= 6,
    };
  }
}

import { prisma } from "@/lib/db";
import { env } from "@/config/env";
import { getResolution } from "@/config/video";
import { videoLog } from "@/lib/logger";
import { resolvePublicFileUrl } from "@/lib/public-url";
import { mapWithConcurrency } from "@/lib/concurrency";
import { findReadableLocalPath } from "@/storage/paths";
import { hydrateStoryPlan, parseStoryPlan } from "@/services/story-plan-hydrator";
import { findBestGameplayMatch } from "@/services/gameplay-matcher";
import { attachGameplayClipToScene } from "@/services/gameplay-attach";
import { routeVideoProvider } from "@/services/video-provider-router";
import { VisualAssetService, VoiceGenerationService, MusicService } from "@/services/asset-generation";
import { AudioTimelineService } from "@/services/audio-timeline";
import { SubtitleService } from "@/services/subtitle";
import { VideoRenderService } from "@/services/video-render";
import { MetadataService, ThumbnailService } from "@/services/metadata";
import { ContentSafetyService } from "@/services/content-safety";
import { CostTrackingService } from "@/services/cost-tracking";
import { StudioQCService } from "@/services/studio-qc";
import { generateShortsFromPlan } from "@/services/shorts-engine";
import { stepProgress } from "@/jobs/queue";
import type { JobStep, StoryStudioStatus } from "@/lib/generated/prisma/client";
import { shouldGenerateSceneVideos } from "@/lib/video-generation-mode";
import { isRunwayConfigured } from "@/providers/runway/client";

export class StudioPipelineProcessor {
  private visualService = new VisualAssetService();
  private voiceService = new VoiceGenerationService();
  private musicService = new MusicService();
  private timelineService = new AudioTimelineService();
  private subtitleService = new SubtitleService();
  private renderService = new VideoRenderService();
  private metadataService = new MetadataService();
  private thumbnailService = new ThumbnailService();
  private safetyService = new ContentSafetyService();
  private costTracker = new CostTrackingService();
  private studioQC = new StudioQCService();

  async run(projectId: string, jobId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");
    if (!project.storyPlan) throw new Error("Story plan missing — generate story first");

    const plan = parseStoryPlan(project.storyPlan);
    const settings = (project.studioSettings ?? {}) as { qcThreshold?: number; shortsCount?: number };
    const qcThreshold = settings.qcThreshold ?? 8;

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "GENERATING", studioStatus: "STORYBOARD_READY" },
    });

    const safety = await this.safetyService.checkInput(project.idea);
    if (!safety.safe) throw new Error(safety.suggestion || "Content safety check failed");

    // Hydrate story plan → DB scenes
    await this.updateStep(jobId, "CREATE_SCENES");
    const { scenes: hydratedScenes } = await hydrateStoryPlan(projectId, plan);

    // Gameplay matching
    await this.updateStudioStatus(projectId, "ASSETS_MATCHING");
    const clips = await prisma.gameplayClip.findMany({
      where: { userId: project.userId, status: "ready" },
    });

    for (const { record, storyScene } of hydratedScenes) {
      if (storyScene.aiVideoRequired) continue;
      const match = findBestGameplayMatch(
        clips.map((c) => ({
          id: c.id,
          tags: c.tags,
          metadata: c.metadata as Record<string, unknown> | null,
          duration: c.duration,
        })),
        storyScene,
      );
      if (match) {
        const clip = clips.find((c) => c.id === match.clipId);
        if (clip) {
          await attachGameplayClipToScene(projectId, record.id, clip, match.score);
        }
      }
    }

    const { width, height } = getResolution(project.aspectRatio);
    const useVideo = shouldGenerateSceneVideos({
      idea: project.idea,
      videoType: project.videoType,
      generationMode: project.generationMode,
      visualGenerationMode: project.visualGenerationMode,
    });

    // AI visuals for unmatched / AI-required scenes
    await this.updateStep(jobId, "GENERATE_VISUALS");
    await this.updateStudioStatus(projectId, "AI_SHOTS_GENERATING");

    const imageFirstVideo =
      (isRunwayConfigured() &&
        (env.AI_VIDEO_PROVIDER === "runway" ||
          env.AI_VIDEO_PROVIDER === "studio" ||
          env.AI_VIDEO_PROVIDER === "builtin" ||
          env.AI_VIDEO_PROVIDER === "local")) ||
      env.AI_VIDEO_PROVIDER === "studio" ||
      env.AI_VIDEO_PROVIDER === "builtin" ||
      env.AI_VIDEO_PROVIDER === "local";

    await mapWithConcurrency(hydratedScenes, 2, async ({ record, storyScene }) => {
      const scene = await prisma.scene.findUnique({ where: { id: record.id } });
      if (scene?.videoAssetId) return;

      const promptSafety = await this.safetyService.checkPrompt(
        scene?.visualPrompt || scene?.visualDescription || "",
      );
      if (!promptSafety.safe) return;

      const route = routeVideoProvider(storyScene);
      const prompt = storyScene.aiVideoPrompt || scene?.visualPrompt || scene?.visualDescription || "";

      if (useVideo) {
        if (imageFirstVideo) {
          const imageAsset = await this.visualService.generateImage(
            projectId,
            record.id,
            prompt,
            "",
            width,
            height,
          );
          const referenceUrl = resolvePublicFileUrl(
            imageAsset.url ?? `/api/files/projects/${projectId}/images/${record.id}.png`,
          );
          await this.visualService.generateVideo(
            projectId,
            record.id,
            prompt,
            "",
            width,
            height,
            storyScene.duration,
            referenceUrl,
            imageAsset.localPath ?? undefined,
            storyScene.camera,
          );
        } else {
          await this.visualService.generateVideo(
            projectId,
            record.id,
            prompt,
            "",
            width,
            height,
            storyScene.duration,
            undefined,
            undefined,
            storyScene.camera,
          );
        }
      } else {
        await this.visualService.generateImage(
          projectId,
          record.id,
          prompt,
          "",
          width,
          height,
        );
      }

      await prisma.scene.update({
        where: { id: record.id },
        data: {
          status: "visual_complete",
          alternatives: {
            storyStudio: {
              ...((
                (scene?.alternatives as Record<string, unknown>)?.storyStudio as Record<string, unknown>
              ) ?? {}),
              videoProvider: route.provider,
            },
          },
        },
      });
    });

    // Voice
    await this.updateStep(jobId, "GENERATE_VOICE");
    await this.updateStudioStatus(projectId, "VOICE_GENERATING");
    const wordTimingsMap = new Map<string, Array<{ word: string; start: number; end: number }>>();

    if (project.voice !== "NONE") {
      await mapWithConcurrency(hydratedScenes, 1, async ({ record, storyScene }) => {
        const scene = await prisma.scene.findUnique({ where: { id: record.id } });
        if (!scene?.narration) return;
        const emotion = storyScene.voiceDirection?.emotion;
        const result = await this.voiceService.generateForScene(
          projectId,
          record.id,
          scene.narration,
          project.language,
          project.voice,
          emotion,
        );
        if (result.wordTimings) wordTimingsMap.set(record.id, result.wordTimings);
      });
    }

    await this.updateStudioStatus(projectId, "AUDIO_READY");

    // Music + SFX steps
    await this.updateStep(jobId, "GENERATE_MUSIC");
    const mood = plan.scenes[0]?.musicMood || project.genre || "cinematic";
    await this.musicService.generateForProject(projectId, mood, project.duration);
    await this.updateStep(jobId, "GENERATE_SFX");

    // Timeline
    await this.updateStep(jobId, "BUILD_TIMELINE");
    await this.updateStudioStatus(projectId, "TIMELINE_READY");

    const scenesWithVoice = await prisma.scene.findMany({
      where: { projectId },
      orderBy: { sceneNumber: "asc" },
    });
    const voiceAssets = await prisma.asset.findMany({ where: { projectId, type: "VOICE" } });

    const timeline = this.timelineService.buildTimeline(
      scenesWithVoice.map((s) => {
        const voiceAsset = voiceAssets.find((a) => a.sceneId === s.id);
        return {
          id: s.id,
          sceneNumber: s.sceneNumber,
          duration: s.duration,
          narrationDuration: voiceAsset?.duration ?? undefined,
          soundEffects: s.soundEffects,
        };
      }),
    );

    // Subtitles
    await this.updateStep(jobId, "GENERATE_SUBTITLES");
    const timelineScenes = timeline.scenes.map((ts) => {
      const scene = scenesWithVoice.find((s) => s.id === ts.id)!;
      return {
        id: ts.id,
        narration: scene.narration,
        caption: scene.caption,
        duration: ts.adjustedDuration,
        startTime: ts.startTime,
      };
    });
    const subtitleEntries = await this.subtitleService.generateFromScenes(
      projectId,
      timelineScenes,
      wordTimingsMap,
    );

    // Render
    await this.updateStep(jobId, "RENDER_VIDEO");
    await this.updateStudioStatus(projectId, "RENDERING");
    await prisma.project.update({ where: { id: projectId }, data: { status: "RENDERING" } });

    const imageAssets = await prisma.asset.findMany({ where: { projectId, type: "IMAGE" } });
    const videoAssets = await prisma.asset.findMany({ where: { projectId, type: "VIDEO" } });
    const musicAsset = await prisma.asset.findFirst({ where: { projectId, type: "MUSIC" } });

    const renderScenes = timeline.scenes.map((ts) => {
      const scene = scenesWithVoice.find((s) => s.id === ts.id)!;
      return {
        sceneId: ts.id,
        sceneNumber: ts.sceneNumber,
        duration: ts.adjustedDuration,
        imagePath: imageAssets.find((a) => a.sceneId === ts.id)?.localPath ?? undefined,
        videoPath: videoAssets.find((a) => a.sceneId === ts.id)?.localPath ?? undefined,
        voicePath: voiceAssets.find((a) => a.sceneId === ts.id)?.localPath ?? undefined,
        cameraMovement: scene.cameraMovement ?? undefined,
        transition: scene.transition ?? undefined,
      };
    });

    const renderResult = await this.renderService.render({
      projectId,
      version: project.version,
      width,
      height,
      fps: env.RENDER_FPS,
      scenes: renderScenes,
      musicPath: musicAsset?.localPath ?? undefined,
      subtitles: subtitleEntries,
      burnSubtitles: true,
    });

    const render = await prisma.render.create({
      data: {
        projectId,
        version: project.version,
        videoUrl: `/api/files/projects/${projectId}/renders/v${project.version}/final.mp4`,
        localPath: renderResult.videoPath,
        thumbnailUrl: `/api/files/projects/${projectId}/renders/v${project.version}/thumbnail.jpg`,
        width,
        height,
        duration: renderResult.duration,
        fileSize: renderResult.fileSize,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        finalVideoUrl: render.videoUrl,
        thumbnailUrl: render.thumbnailUrl,
      },
    });

    const videoPath = await findReadableLocalPath(
      `projects/${projectId}/renders/v${project.version}/final.mp4`,
      [renderResult.videoPath],
    );
    if (!videoPath) throw new Error("Rendered video missing on disk");

    // QC
    await this.updateStudioStatus(projectId, "QC_RUNNING");
    const qc = await this.studioQC.analyze(videoPath, plan, {
      hasVoice: voiceAssets.length > 0,
      hasSubtitles: subtitleEntries.length > 0,
      sceneCount: scenesWithVoice.length,
    });

    const shorts = generateShortsFromPlan(plan, settings.shortsCount ?? 5);
    const studioStatus: StoryStudioStatus =
      qc.overallScore >= qcThreshold ? "READY_FOR_REVIEW" : "REVISION_REQUIRED";

    await prisma.project.update({
      where: { id: projectId },
      data: {
        qualityScore: qc.overallScore,
        studioStatus,
        studioSettings: {
          ...settings,
          qcResult: qc as object,
          shorts: shorts as object[],
        },
      },
    });

    if (!qc.valid) {
      videoLog("Studio QC warnings", { projectId, issues: qc.issues }, "warn");
    }

    await this.updateStep(jobId, "GENERATE_THUMBNAIL");
    await this.thumbnailService.generate(projectId, project.version);

    await this.updateStep(jobId, "GENERATE_METADATA");
    await this.metadataService.generate(projectId);

    await this.updateStep(jobId, "COMPLETE");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "COMPLETED" },
    });

    await this.costTracker.estimate(projectId);
  }

  private async updateStep(jobId: string, step: JobStep) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { step, progress: stepProgress(step) },
    });
  }

  private async updateStudioStatus(projectId: string, status: StoryStudioStatus) {
    await prisma.project.update({
      where: { id: projectId },
      data: { studioStatus: status },
    });
  }
}

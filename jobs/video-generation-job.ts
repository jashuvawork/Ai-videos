import { prisma } from "@/lib/db";
import { getResolution } from "@/config/video";
import { env } from "@/config/env";
import { videoLog } from "@/lib/logger";
import { resolvePublicFileUrl } from "@/lib/public-url";
import { mapWithConcurrency } from "@/lib/concurrency";
import { findReadableLocalPath } from "@/storage/paths";
import { StoryGenerationService } from "@/services/story-generation";
import { CharacterConsistencyService } from "@/services/character-consistency";
import { SceneGenerationService } from "@/services/scene-generation";
import { VisualAssetService, VoiceGenerationService, MusicService } from "@/services/asset-generation";
import { AudioTimelineService } from "@/services/audio-timeline";
import { SubtitleService } from "@/services/subtitle";
import { VideoRenderService } from "@/services/video-render";
import { MetadataService, ThumbnailService } from "@/services/metadata";
import { ContentSafetyService } from "@/services/content-safety";
import { CostTrackingService } from "@/services/cost-tracking";
import { JOB_STEP_ORDER, stepProgress } from "./queue";
import type { JobStep } from "@/lib/generated/prisma/client";

export class VideoGenerationProcessor {
  private storyService = new StoryGenerationService();
  private characterService = new CharacterConsistencyService();
  private sceneService = new SceneGenerationService();
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

  async process(jobId: string, projectId: string, sceneId?: string) {
    const job = await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    try {
      if (sceneId) {
        await this.regenerateScene(projectId, sceneId, jobId);
        return;
      }

      await this.runFullPipeline(projectId, jobId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      videoLog("Job failed", { projectId, jobId, error: message }, "error");

      await prisma.generationJob.update({
        where: { id: jobId },
        data: {
          status: "FAILED",
          error: message,
          completedAt: new Date(),
        },
      });

      await prisma.project.update({
        where: { id: projectId },
        data: { status: "FAILED", errorMessage: message },
      });

      if (job.retryCount < job.maxRetries) {
        await prisma.generationJob.update({
          where: { id: jobId },
          data: { retryCount: job.retryCount + 1, status: "RETRYING" },
        });
      }
    }
  }

  private async updateStep(jobId: string, step: JobStep) {
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { step, progress: stepProgress(step) },
    });
  }

  private async runFullPipeline(projectId: string, jobId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    await prisma.project.update({
      where: { id: projectId },
      data: { status: "GENERATING" },
    });

    const safety = await this.safetyService.checkInput(project.idea);
    if (!safety.safe) throw new Error(safety.suggestion || "Content safety check failed");

    // CREATE_SCRIPT
    await this.updateStep(jobId, "CREATE_SCRIPT");
    const story = await this.storyService.generate({
      idea: project.idea,
      videoType: project.videoType,
      duration: project.duration,
      language: project.language,
      tone: project.tone || project.visualStyle,
      platform: project.platform,
      visualStyle: project.visualStyle,
      generationMode: project.generationMode,
      projectId,
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        title: story.title,
        hook: story.hook,
        summary: story.summary,
        tone: story.tone,
        script: story as object,
      },
    });

    // CREATE_CHARACTER_BIBLE
    await this.updateStep(jobId, "CREATE_CHARACTER_BIBLE");
    await prisma.character.deleteMany({ where: { projectId } });
    const characters = await this.characterService.saveCharacters(projectId, story.characters);

    // CREATE_SCENES
    await this.updateStep(jobId, "CREATE_SCENES");
    await prisma.scene.deleteMany({ where: { projectId } });

    const mappedCharacters = characters.map((c) => ({
      name: c.name,
      visualToken: c.visualToken ?? undefined,
      visualIdentity: c.visualIdentity ?? undefined,
    }));
    const visualPrompts = await this.sceneService.generateVisualPrompts(
      story.scenes,
      mappedCharacters,
      project.visualStyle,
      project.aspectRatio,
      projectId,
    );

    const sceneRecords = [];
    for (const scene of story.scenes) {
      const vp = visualPrompts.find((v) => v.sceneNumber === scene.sceneNumber);
      const record = await prisma.scene.create({
        data: {
          projectId,
          sceneNumber: scene.sceneNumber,
          duration: scene.duration,
          narration: scene.narration,
          dialogue: scene.dialogue,
          visualDescription: scene.visualDescription,
          visualPrompt: vp?.visualPrompt,
          negativePrompt: vp?.negativePrompt,
          cameraMovement: vp?.cameraMovement || scene.cameraMovement,
          cameraAngle: scene.cameraAngle,
          lighting: vp?.lighting || scene.lighting,
          environment: vp?.environment || scene.environment,
          soundEffects: scene.soundEffects,
          musicMood: scene.musicMood,
          caption: scene.caption,
          transition: vp?.transition || scene.transition,
          emotion: vp?.emotion || scene.emotion,
          status: "pending",
        },
      });
      sceneRecords.push(record);
    }

    const { width, height } = getResolution(project.aspectRatio);
    const useVideo =
      project.generationMode !== "FAST" &&
      (project.visualGenerationMode === "AI_VIDEO" ||
        (project.visualGenerationMode === "AUTOMATIC" && project.generationMode === "CINEMATIC"));

    // GENERATE_VISUALS
    await this.updateStep(jobId, "GENERATE_VISUALS");

    const imageFirstVideo =
      (env.AI_VIDEO_PROVIDER === "runway" && (env.VIDEO_API_KEY || env.RUNWAY_API_KEY)) ||
      env.AI_VIDEO_PROVIDER === "studio" ||
      env.AI_VIDEO_PROVIDER === "builtin" ||
      env.AI_VIDEO_PROVIDER === "local";

    await mapWithConcurrency(sceneRecords, 3, async (scene) => {
      const promptSafety = await this.safetyService.checkPrompt(
        scene.visualPrompt || scene.visualDescription || "",
      );
      if (!promptSafety.safe) return;

      if (useVideo) {
        let videoAsset = null;

        if (imageFirstVideo) {
          const imageAsset = await this.visualService.generateImage(
            projectId,
            scene.id,
            scene.visualPrompt || scene.visualDescription || "",
            scene.negativePrompt || "",
            width,
            height,
          );
          const referenceUrl = resolvePublicFileUrl(
            imageAsset.url ?? `/api/files/projects/${projectId}/images/${scene.id}.png`,
          );
          videoAsset = await this.visualService.generateVideo(
            projectId,
            scene.id,
            scene.visualPrompt || scene.visualDescription || "",
            scene.negativePrompt || "",
            width,
            height,
            scene.duration,
            referenceUrl,
            imageAsset.localPath ?? undefined,
          );
        } else {
          videoAsset = await this.visualService.generateVideo(
            projectId,
            scene.id,
            scene.visualPrompt || scene.visualDescription || "",
            scene.negativePrompt || "",
            width,
            height,
            scene.duration,
          );
        }

        if (!videoAsset) {
          await this.visualService.generateImage(
            projectId,
            scene.id,
            scene.visualPrompt || scene.visualDescription || "",
            scene.negativePrompt || "",
            width,
            height,
          );
        }
      } else {
        await this.visualService.generateImage(
          projectId,
          scene.id,
          scene.visualPrompt || scene.visualDescription || "",
          scene.negativePrompt || "",
          width,
          height,
        );
      }

      await prisma.scene.update({ where: { id: scene.id }, data: { status: "visual_complete" } });
    });

    // GENERATE_VOICE
    await this.updateStep(jobId, "GENERATE_VOICE");
    const wordTimingsMap = new Map<string, Array<{ word: string; start: number; end: number }>>();

    if (project.voice !== "NONE") {
      await mapWithConcurrency(sceneRecords, 3, async (scene) => {
        if (!scene.narration) return;
        const result = await this.voiceService.generateForScene(
          projectId,
          scene.id,
          scene.narration,
          project.language,
          project.voice,
        );
        if (result.wordTimings) {
          wordTimingsMap.set(scene.id, result.wordTimings);
        }
      });
    }

    // GENERATE_MUSIC
    await this.updateStep(jobId, "GENERATE_MUSIC");
    const mood = story.scenes[0]?.musicMood || "cinematic";
    await this.musicService.generateForProject(projectId, mood, project.duration);

    // GENERATE_SFX - tracked in timeline
    await this.updateStep(jobId, "GENERATE_SFX");

    // BUILD_TIMELINE
    await this.updateStep(jobId, "BUILD_TIMELINE");
    const scenesWithVoice = await prisma.scene.findMany({
      where: { projectId },
      orderBy: { sceneNumber: "asc" },
      include: { project: false },
    });

    const voiceAssets = await prisma.asset.findMany({
      where: { projectId, type: "VOICE" },
    });

    const scenesForTimeline = scenesWithVoice.map((s) => {
      const voiceAsset = voiceAssets.find((a) => a.sceneId === s.id);
      return {
        id: s.id,
        sceneNumber: s.sceneNumber,
        duration: s.duration,
        narrationDuration: voiceAsset?.duration ?? undefined,
        soundEffects: s.soundEffects,
      };
    });

    const timeline = this.timelineService.buildTimeline(scenesForTimeline);

    // GENERATE_SUBTITLES
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
      projectId, timelineScenes, wordTimingsMap,
    );

    // RENDER_VIDEO
    await this.updateStep(jobId, "RENDER_VIDEO");
    await prisma.project.update({ where: { id: projectId }, data: { status: "RENDERING" } });

    const imageAssets = await prisma.asset.findMany({ where: { projectId, type: "IMAGE" } });
    const videoAssets = await prisma.asset.findMany({ where: { projectId, type: "VIDEO" } });
    const musicAsset = await prisma.asset.findFirst({ where: { projectId, type: "MUSIC" } });

    const renderScenes = timeline.scenes.map((ts) => {
      const scene = scenesWithVoice.find((s) => s.id === ts.id)!;
      const imageAsset = imageAssets.find((a) => a.sceneId === ts.id);
      const videoAsset = videoAssets.find((a) => a.sceneId === ts.id);
      const voiceAsset = voiceAssets.find((a) => a.sceneId === ts.id);

      return {
        sceneId: ts.id,
        sceneNumber: ts.sceneNumber,
        duration: ts.adjustedDuration,
        imagePath: imageAsset?.localPath ?? undefined,
        videoPath: videoAsset?.localPath ?? undefined,
        voicePath: voiceAsset?.localPath ?? undefined,
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

    const videoAssetPath = `projects/${projectId}/renders/v${project.version}/final.mp4`;
    const verifiedPath = await findReadableLocalPath(videoAssetPath, [renderResult.videoPath]);
    if (!verifiedPath) {
      throw new Error(
        `Rendered video missing on disk at ${renderResult.videoPath}. Check STORAGE_LOCAL_PATH.`,
      );
    }

    // GENERATE_THUMBNAIL
    await this.updateStep(jobId, "GENERATE_THUMBNAIL");
    await this.thumbnailService.generate(projectId, project.version);

    // GENERATE_METADATA
    await this.updateStep(jobId, "GENERATE_METADATA");
    await this.metadataService.generate(projectId);

    // COMPLETE
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

  private async regenerateScene(projectId: string, sceneId: string, jobId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
    if (!project || !scene) throw new Error("Project or scene not found");

    const { width, height } = getResolution(project.aspectRatio);
    const characters = await prisma.character.findMany({ where: { projectId } });

    await this.updateStep(jobId, "GENERATE_VISUALS");
    await this.visualService.generateImage(
      projectId, sceneId,
      scene.visualPrompt || scene.visualDescription || "",
      scene.negativePrompt || "",
      width, height,
    );

    if (project.voice !== "NONE" && scene.narration) {
      await this.updateStep(jobId, "GENERATE_VOICE");
      await this.voiceService.generateForScene(
        projectId, sceneId, scene.narration, project.language, project.voice,
      );
    }

    // Re-render
    await this.updateStep(jobId, "RENDER_VIDEO");
    const newVersion = project.version + 1;
    await prisma.project.update({
      where: { id: projectId },
      data: { version: newVersion, status: "RENDERING" },
    });

    // Trigger full re-render with updated scene
    await this.rerenderProject(projectId, newVersion, jobId);
  }

  private async rerenderProject(projectId: string, version: number, jobId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return;

    const scenes = await prisma.scene.findMany({
      where: { projectId },
      orderBy: { sceneNumber: "asc" },
    });

    const imageAssets = await prisma.asset.findMany({ where: { projectId, type: "IMAGE" } });
    const videoAssets = await prisma.asset.findMany({ where: { projectId, type: "VIDEO" } });
    const voiceAssets = await prisma.asset.findMany({ where: { projectId, type: "VOICE" } });
    const musicAsset = await prisma.asset.findFirst({ where: { projectId, type: "MUSIC" } });

    const { width, height } = getResolution(project.aspectRatio);

    const scenesForTimeline = scenes.map((s) => {
      const voiceAsset = voiceAssets.find((a) => a.sceneId === s.id);
      return {
        id: s.id,
        sceneNumber: s.sceneNumber,
        duration: s.duration,
        narrationDuration: voiceAsset?.duration ?? undefined,
        soundEffects: s.soundEffects,
      };
    });

    const timeline = this.timelineService.buildTimeline(scenesForTimeline);
    const subtitles = await prisma.subtitle.findMany({ where: { projectId } });

    const renderScenes = timeline.scenes.map((ts) => {
      const scene = scenes.find((s) => s.id === ts.id)!;
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
      version,
      width,
      height,
      fps: env.RENDER_FPS,
      scenes: renderScenes,
      musicPath: musicAsset?.localPath ?? undefined,
      subtitles: subtitles.map((s) => ({
        text: s.text,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
      burnSubtitles: true,
    });

    const render = await prisma.render.create({
      data: {
        projectId,
        version,
        videoUrl: `/api/files/projects/${projectId}/renders/v${version}/final.mp4`,
        localPath: renderResult.videoPath,
        thumbnailUrl: `/api/files/projects/${projectId}/renders/v${version}/thumbnail.jpg`,
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

    const videoAssetPath = `projects/${projectId}/renders/v${version}/final.mp4`;
    const verifiedPath = await findReadableLocalPath(videoAssetPath, [renderResult.videoPath]);
    if (!verifiedPath) {
      throw new Error(
        `Rendered video missing on disk at ${renderResult.videoPath}. Check STORAGE_LOCAL_PATH.`,
      );
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        finalVideoUrl: render.videoUrl,
        thumbnailUrl: render.thumbnailUrl,
        status: "COMPLETED",
      },
    });

    await this.updateStep(jobId, "COMPLETE");
    await prisma.generationJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", progress: 100, completedAt: new Date() },
    });
  }
}

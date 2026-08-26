import { createProviders } from "@/providers";
import { storage } from "@/storage";
import { prisma } from "@/lib/db";
import { sanitizeFilename } from "@/lib/utils";
import { detectImageFormatFromBuffer } from "@/providers/studio/ffmpeg-visual";
import { CostTrackingService } from "./cost-tracking";
import type { AssetType } from "@/lib/generated/prisma/client";

export class VoiceGenerationService {
  private costTracker = new CostTrackingService();

  async generateForScene(
    projectId: string,
    sceneId: string,
    text: string,
    language: string,
    voice: string,
    emotion?: string,
  ) {
    const providers = createProviders();
    const voiceType = voice.toLowerCase();

    const response = await providers.voice.generate({
      text,
      language,
      voice: voiceType,
      emotion,
      speed: 1.0,
    });

    const path = `projects/${projectId}/voice/${sceneId}.mp3`;
    const stored = await storage.upload(response.audioBuffer, path, "audio/mpeg");

    const asset = await prisma.asset.create({
      data: {
        projectId,
        sceneId,
        type: "VOICE",
        provider: response.provider,
        url: stored.url,
        localPath: stored.localPath,
        mimeType: "audio/mpeg",
        fileSize: stored.fileSize,
        duration: response.duration,
        isMock: response.isMock ?? false,
        metadata: { wordTimings: response.wordTimings, voice: response.voice, language: response.language } as object,
      },
    });

    await prisma.scene.update({
      where: { id: sceneId },
      data: { voiceAssetId: asset.id },
    });

    await this.costTracker.track({
      projectId,
      category: "voice",
      provider: response.provider,
      operation: "voice_generation",
      amount: response.cost || 0.005,
    });

    return { asset, duration: response.duration, wordTimings: response.wordTimings };
  }
}

export class MusicService {
  private costTracker = new CostTrackingService();

  async generateForProject(projectId: string, mood: string, duration: number) {
    const providers = createProviders();
    const response = await providers.music.generate({ mood, duration, intensity: 0.6 });

    const path = `projects/${projectId}/music/background.mp3`;
    const stored = await storage.upload(response.audioBuffer, path, "audio/mpeg");

    const asset = await prisma.asset.create({
      data: {
        projectId,
        type: "MUSIC",
        provider: response.provider,
        url: stored.url,
        localPath: stored.localPath,
        mimeType: "audio/mpeg",
        fileSize: stored.fileSize,
        duration: response.duration,
        isMock: response.isMock ?? false,
        metadata: { mood: response.mood },
      },
    });

    await this.costTracker.track({
      projectId,
      category: "music",
      provider: response.provider,
      operation: "music_generation",
      amount: response.cost || 0.03,
    });

    return asset;
  }
}

export class VisualAssetService {
  private costTracker = new CostTrackingService();

  async generateImage(
    projectId: string,
    sceneId: string,
    prompt: string,
    negativePrompt: string,
    width: number,
    height: number,
    referenceImageUrl?: string,
  ) {
    const providers = createProviders();
    const response = await providers.image.generate({
      prompt,
      negativePrompt,
      width,
      height,
      referenceImageUrl,
    });

    const format = detectImageFormatFromBuffer(response.imageBuffer);
    const ext = format?.ext ?? "png";
    const mime = format?.mime ?? "image/png";
    const path = `projects/${projectId}/images/${sceneId}.${ext}`;
    const stored = await storage.upload(response.imageBuffer, path, mime);

    const asset = await prisma.asset.create({
      data: {
        projectId,
        sceneId,
        type: "IMAGE",
        provider: response.provider,
        url: stored.url,
        localPath: stored.localPath,
        mimeType: "image/png",
        fileSize: stored.fileSize,
        width: response.width,
        height: response.height,
        isMock: response.isMock ?? false,
      },
    });

    await prisma.scene.update({
      where: { id: sceneId },
      data: { imageAssetId: asset.id },
    });

    await this.costTracker.track({
      projectId,
      category: "image",
      provider: response.provider,
      operation: "image_generation",
      amount: response.cost || 0.02,
    });

    return asset;
  }

  async generateVideo(
    projectId: string,
    sceneId: string,
    prompt: string,
    negativePrompt: string,
    width: number,
    height: number,
    duration: number,
    referenceImageUrl?: string,
    referenceImagePath?: string,
  ) {
    const providers = createProviders();

    try {
      const response = await providers.video.generate({
        prompt,
        negativePrompt,
        width,
        height,
        duration,
        referenceImageUrl,
        referenceImagePath,
      });

      const path = `projects/${projectId}/videos/${sceneId}.mp4`;
      const stored = await storage.upload(response.videoBuffer, path, "video/mp4");

      const asset = await prisma.asset.create({
        data: {
          projectId,
          sceneId,
          type: "VIDEO",
          provider: response.provider,
          url: stored.url,
          localPath: stored.localPath,
          mimeType: "video/mp4",
          fileSize: stored.fileSize,
          width: response.width,
          height: response.height,
          duration: response.duration,
          isMock: response.isMock ?? false,
        },
      });

      await prisma.scene.update({
        where: { id: sceneId },
        data: { videoAssetId: asset.id },
      });

      await this.costTracker.track({
        projectId,
        category: "video",
        provider: response.provider,
        operation: "video_generation",
        amount: response.cost || 0.15,
      });

      return asset;
    } catch {
      // Fallback to image mode
      return null;
    }
  }
}

import { prisma } from "@/lib/db";

export interface PublishPackage {
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  description: string;
  caption: string;
  hashtags: string;
  platform: string;
}

export class SocialPublishingService {
  async prepareForPublishing(projectId: string, platform: string): Promise<PublishPackage> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { socialMetadata: true, renders: { orderBy: { version: "desc" }, take: 1 } },
    });

    if (!project) throw new Error("Project not found");

    const render = project.renders[0];
    const meta = project.socialMetadata;

    const base: PublishPackage = {
      videoUrl: render?.videoUrl || project.finalVideoUrl || "",
      thumbnailUrl: project.thumbnailUrl ?? render?.thumbnailUrl ?? undefined,
      title: project.title || "Untitled",
      description: meta?.youtubeDescription || project.summary || "",
      caption: "",
      hashtags: "",
      platform,
    };

    switch (platform) {
      case "youtube":
      case "YOUTUBE":
        return {
          ...base,
          title: meta?.youtubeTitle || base.title,
          description: meta?.youtubeDescription || base.description,
          hashtags: meta?.youtubeHashtags || "",
          caption: meta?.youtubeDescription || "",
        };
      case "instagram":
      case "INSTAGRAM_REEL":
        return {
          ...base,
          caption: meta?.instagramCaption || project.hook || "",
          hashtags: meta?.instagramHashtags || "",
        };
      case "tiktok":
      case "TIKTOK":
        return {
          ...base,
          caption: meta?.tiktokCaption || project.hook || "",
          hashtags: meta?.tiktokHashtags || "",
        };
      default:
        return base;
    }
  }
}

export interface PlatformPublisher {
  publish(pkg: PublishPackage): Promise<{ url: string }>;
}

export class InstagramPublisher implements PlatformPublisher {
  async publish(_pkg: PublishPackage): Promise<{ url: string }> {
    throw new Error("Instagram OAuth not configured. Use prepareForPublishing instead.");
  }
}

export class YouTubePublisher implements PlatformPublisher {
  async publish(_pkg: PublishPackage): Promise<{ url: string }> {
    throw new Error("YouTube OAuth not configured. Use prepareForPublishing instead.");
  }
}

export class TikTokPublisher implements PlatformPublisher {
  async publish(_pkg: PublishPackage): Promise<{ url: string }> {
    throw new Error("TikTok OAuth not configured. Use prepareForPublishing instead.");
  }
}

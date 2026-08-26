import { createProviders } from "@/providers";
import { metadataPrompt } from "@/lib/prompts";
import { SocialMetadataSchema } from "@/lib/schemas";
import { parseAiJson } from "@/lib/utils";
import { prisma } from "@/lib/db";
import { CostTrackingService } from "./cost-tracking";

export class MetadataService {
  private costTracker = new CostTrackingService();

  async generate(projectId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new Error("Project not found");

    const providers = createProviders();
    const prompt = metadataPrompt({
      title: project.title || "Untitled",
      summary: project.summary || project.idea,
      hook: project.hook || "",
      platform: project.platform,
      duration: project.duration,
    });

    const response = await providers.llm.generate({ prompt, jsonMode: true });
    const meta = await parseAiJson(response.text, SocialMetadataSchema);

    await prisma.socialMetadata.upsert({
      where: { projectId },
      create: { projectId, ...meta },
      update: meta,
    });

    await this.costTracker.track({
      projectId,
      category: "llm",
      provider: response.provider,
      operation: "metadata_generation",
      amount: response.cost || 0.003,
    });

    return meta;
  }
}

export class ThumbnailService {
  async generate(projectId: string, version: number) {
    const render = await prisma.render.findFirst({
      where: { projectId, version },
      orderBy: { createdAt: "desc" },
    });

    if (render?.thumbnailUrl) {
      await prisma.project.update({
        where: { id: projectId },
        data: { thumbnailUrl: render.thumbnailUrl },
      });
      return render.thumbnailUrl;
    }

    // Generate from first scene image
    const scene = await prisma.scene.findFirst({
      where: { projectId },
      orderBy: { sceneNumber: "asc" },
    });

    if (scene?.imageAssetId) {
      const asset = await prisma.asset.findUnique({ where: { id: scene.imageAssetId } });
      if (asset?.url) {
        await prisma.project.update({
          where: { id: projectId },
          data: { thumbnailUrl: asset.url },
        });
        return asset.url;
      }
    }

    return null;
  }
}

import { copyFile, stat } from "fs/promises";
import { prisma } from "@/lib/db";
import { storage } from "@/storage";
import { findReadableLocalPath } from "@/storage/paths";
import type { GameplayClip } from "@/lib/generated/prisma/client";

export async function attachGameplayClipToScene(
  projectId: string,
  sceneId: string,
  clip: GameplayClip,
  matchScore?: number,
) {
  const sourcePath = await findReadableLocalPath(clip.storageKey, [storage.getLocalPath(clip.storageKey)]);
  if (!sourcePath) {
    throw new Error(`Gameplay clip file not found: ${clip.storageKey}`);
  }

  const destKey = `projects/${projectId}/videos/${sceneId}-gameplay.mp4`;
  const destPath = storage.getLocalPath(destKey);
  await copyFile(sourcePath, destPath);
  const fileStat = await stat(destPath);

  const asset = await prisma.asset.create({
    data: {
      projectId,
      sceneId,
      type: "VIDEO",
      provider: "gameplay",
      url: `/api/files/${destKey}`,
      localPath: destPath,
      mimeType: clip.mimeType ?? "video/mp4",
      fileSize: fileStat.size,
      duration: clip.duration,
      width: clip.width,
      height: clip.height,
      metadata: {
        gameplayClipId: clip.id,
        matchScore,
        originalFilename: clip.originalFilename,
      },
    },
  });

  const scene = await prisma.scene.findUnique({ where: { id: sceneId } });
  const alternatives = (scene?.alternatives ?? {}) as Record<string, unknown>;
  const storyStudio = (alternatives.storyStudio ?? {}) as Record<string, unknown>;

  await prisma.scene.update({
    where: { id: sceneId },
    data: {
      videoAssetId: asset.id,
      status: "visual_complete",
      alternatives: {
        ...alternatives,
        storyStudio: {
          ...storyStudio,
          matchedClipId: clip.id,
          matchScore: matchScore ?? null,
          source: "gameplay",
        },
      },
    },
  });

  return asset;
}

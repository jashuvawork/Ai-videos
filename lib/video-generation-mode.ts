import { isProcessVideo, resolveContentType } from "@/lib/director/detect";

type ProjectVisualSettings = {
  idea: string;
  videoType: string;
  generationMode: string;
  visualGenerationMode: string;
};

/**
 * Per-scene motion clips (not render-time still Ken Burns) unless user chose images-only.
 */
export function shouldGenerateSceneVideos(project: ProjectVisualSettings): boolean {
  if (project.visualGenerationMode === "IMAGES") return false;
  if (project.visualGenerationMode === "AI_VIDEO") return true;

  const contentType = resolveContentType(project.idea, project.videoType);
  if (isProcessVideo(contentType, project.videoType)) return true;
  if (project.generationMode === "CINEMATIC") return true;

  // AUTOMATIC: generate motion clips instead of frozen stills at render time
  return project.visualGenerationMode === "AUTOMATIC";
}

import { env } from "@/config/env";

/**
 * When the app runs on Vercel (or another edge host) but rendering happens on
 * Railway, set ASSETS_BASE_URL to the Railway backend origin so videos/thumbnails
 * are served from the machine that actually has the files on disk.
 */
export function resolveAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base = env.ASSETS_BASE_URL?.replace(/\/$/, "");
  if (!base) return url;

  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export function getAssetsBaseUrl(): string | null {
  const base = env.ASSETS_BASE_URL?.replace(/\/$/, "");
  return base || null;
}

/** Origins to try when fetching files from a remote assets host (Railway backend, etc.). */
export function getAssetFetchBaseUrls(): string[] {
  const bases: string[] = [];
  const assets = env.ASSETS_BASE_URL?.replace(/\/$/, "");
  if (assets) bases.push(assets);

  const app = env.APP_URL?.replace(/\/$/, "");
  if (app && !/localhost|127\.0\.0\.1/.test(app)) bases.push(app);

  return [...new Set(bases)];
}

/** Fetch a file from the remote assets host (/api/files/...). */
export async function fetchRemoteAsset(assetPath: string): Promise<Response | null> {
  const normalized = assetPath.replace(/^\/+/, "");
  const bases = getAssetFetchBaseUrls();
  if (bases.length === 0) return null;

  for (const base of bases) {
    const url = `${base}/api/files/${normalized}`;
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) return response;
    } catch {
      // try next base
    }
  }
  return null;
}

type AssetFields = {
  finalVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  renders?: Array<{
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    [key: string]: unknown;
  }> | null;
};

export function withResolvedAssetUrls<T extends AssetFields>(project: T): T {
  return {
    ...project,
    finalVideoUrl: resolveAssetUrl(project.finalVideoUrl),
    thumbnailUrl: resolveAssetUrl(project.thumbnailUrl),
    renders: project.renders?.map((render) => ({
      ...render,
      videoUrl: resolveAssetUrl(render.videoUrl),
      thumbnailUrl: resolveAssetUrl(render.thumbnailUrl),
    })),
  };
}

import { env } from "@/config/env";

/** Turn a stored `/api/files/...` path into a publicly reachable URL for external APIs (e.g. Runway). */
export function resolvePublicFileUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base = env.ASSETS_BASE_URL?.replace(/\/$/, "") || env.APP_URL.replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}

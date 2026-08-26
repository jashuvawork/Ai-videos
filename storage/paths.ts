import { access } from "fs/promises";
import { join } from "path";
import { env } from "@/config/env";

/** Static uploads subfolder — required for Next.js/Vercel bundler static path analysis. */
const UPLOADS_SUBDIR = "uploads";

/**
 * Resolve the local storage root. Absolute env paths (e.g. /app/uploads, /tmp/uploads)
 * are used as-is; relative paths map to process.cwd()/uploads (or the configured relative path).
 */
export function getStorageBasePath(): string {
  let configured = env.STORAGE_LOCAL_PATH.replace(/\/$/, "").replace(/^\.\//, "");
  if (configured === "app/uploads") {
    configured = "/app/uploads";
  }
  if (configured.startsWith("/")) {
    return configured;
  }

  const relative = configured.replace(/^\.\//, "");
  if (relative === UPLOADS_SUBDIR || relative === "") {
    return join(process.cwd(), UPLOADS_SUBDIR);
  }

  return join(process.cwd(), relative);
}

/** Candidate absolute paths for a stored asset (handles legacy misconfigured storage roots). */
export function getLocalAssetCandidates(assetPath: string, hints: string[] = []): string[] {
  const normalized = assetPath.replace(/^\/+/, "");
  const candidates = new Set<string>();

  for (const hint of hints) {
    if (hint) candidates.add(hint);
  }

  candidates.add(join(getStorageBasePath(), normalized));
  candidates.add(join(process.cwd(), UPLOADS_SUBDIR, normalized));
  candidates.add(join(process.cwd(), "app", UPLOADS_SUBDIR, normalized));
  candidates.add(join("/app", UPLOADS_SUBDIR, normalized));
  candidates.add(join("/app", "app", UPLOADS_SUBDIR, normalized));

  return [...candidates];
}

/** Find the first readable local path for an asset, including legacy storage locations. */
export async function findReadableLocalPath(
  assetPath: string,
  hints: string[] = [],
): Promise<string | null> {
  for (const candidate of getLocalAssetCandidates(assetPath, hints)) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next candidate
    }
  }
  return null;
}

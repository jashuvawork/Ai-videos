import { join } from "path";
import { env } from "@/config/env";

/** Static uploads subfolder — required for Next.js/Vercel bundler static path analysis. */
const UPLOADS_SUBDIR = "uploads";

/**
 * Resolve the local storage root. Absolute env paths (e.g. /app/uploads, /tmp/uploads)
 * are used as-is; relative paths map to process.cwd()/uploads.
 */
export function getStorageBasePath(): string {
  const configured = env.STORAGE_LOCAL_PATH;
  if (configured.startsWith("/")) {
    return configured;
  }
  return join(process.cwd(), UPLOADS_SUBDIR);
}

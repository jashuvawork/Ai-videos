import { mkdir, writeFile, unlink, access } from "fs/promises";
import { join, dirname } from "path";
import { env } from "@/config/env";
import type { StorageProvider, StorageUploadResult } from "./types";
import { getStorageBasePath } from "./paths";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";

  /** Resolve on each call so worker/API always use current env (not module-load snapshot). */
  private basePath(): string {
    return getStorageBasePath();
  }

  async upload(buffer: Buffer, path: string, _mimeType: string): Promise<StorageUploadResult> {
    const fullPath = join(this.basePath(), path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return {
      url: `/api/files/${path}`,
      localPath: fullPath,
      fileSize: buffer.length,
    };
  }

  getLocalPath(path: string): string {
    return join(this.basePath(), path);
  }

  getPublicUrl(path: string): string {
    return `${env.APP_URL}/api/files/${path}`;
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath(), path);
    await unlink(fullPath).catch(() => {});
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(join(this.basePath(), path));
      return true;
    } catch {
      return false;
    }
  }
}

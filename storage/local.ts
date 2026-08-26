import { mkdir, writeFile, unlink, access } from "fs/promises";
import { join, dirname } from "path";
import { env } from "@/config/env";
import type { StorageProvider, StorageUploadResult } from "./types";

export class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private basePath: string;

  constructor() {
    this.basePath = join(process.cwd(), env.STORAGE_LOCAL_PATH);
  }

  async upload(buffer: Buffer, path: string, _mimeType: string): Promise<StorageUploadResult> {
    const fullPath = join(this.basePath, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);
    return {
      url: `/api/files/${path}`,
      localPath: fullPath,
      fileSize: buffer.length,
    };
  }

  getLocalPath(path: string): string {
    return join(this.basePath, path);
  }

  getPublicUrl(path: string): string {
    return `${env.APP_URL}/api/files/${path}`;
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(this.basePath, path);
    await unlink(fullPath).catch(() => {});
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(join(this.basePath, path));
      return true;
    } catch {
      return false;
    }
  }
}

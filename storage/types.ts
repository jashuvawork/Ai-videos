export interface StorageUploadResult {
  url: string;
  localPath: string;
  fileSize: number;
}

export interface StorageProvider {
  readonly name: string;
  upload(buffer: Buffer, path: string, mimeType: string): Promise<StorageUploadResult>;
  getLocalPath(path: string): string;
  getPublicUrl(path: string): string;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}

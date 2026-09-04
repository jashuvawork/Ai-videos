export interface VideoGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  duration: number;
  referenceImageUrl?: string;
  /** Prefer local disk path over HTTP URL for reference stills (avoids self-fetch 404 JSON). */
  referenceImagePath?: string;
  cameraMovement?: string;
}

export interface VideoResponse {
  videoBuffer: Buffer;
  provider: string;
  width: number;
  height: number;
  duration: number;
  cost?: number;
  isMock?: boolean;
}

export interface VideoProvider {
  readonly name: string;
  generate(options: VideoGenerateOptions): Promise<VideoResponse>;
}

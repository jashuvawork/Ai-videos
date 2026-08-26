export interface VideoGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  duration: number;
  referenceImageUrl?: string;
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

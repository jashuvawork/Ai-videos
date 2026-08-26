export interface ImageGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  width: number;
  height: number;
  referenceImageUrl?: string;
  seed?: number;
}

export interface ImageResponse {
  imageBuffer: Buffer;
  provider: string;
  width: number;
  height: number;
  cost?: number;
  isMock?: boolean;
}

export interface ImageProvider {
  readonly name: string;
  generate(options: ImageGenerateOptions): Promise<ImageResponse>;
}

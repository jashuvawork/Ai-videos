export interface MusicGenerateOptions {
  mood: string;
  genre?: string;
  intensity?: number;
  bpm?: number;
  duration: number;
}

export interface MusicResponse {
  audioBuffer: Buffer;
  provider: string;
  duration: number;
  mood: string;
  cost?: number;
  isMock?: boolean;
}

export interface MusicProvider {
  readonly name: string;
  generate(options: MusicGenerateOptions): Promise<MusicResponse>;
}

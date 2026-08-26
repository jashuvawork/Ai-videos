export interface VoiceGenerateOptions {
  text: string;
  language: string;
  voice: string;
  emotion?: string;
  speed?: number;
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface VoiceResponse {
  audioBuffer: Buffer;
  provider: string;
  duration: number;
  voice: string;
  language: string;
  wordTimings?: WordTiming[];
  cost?: number;
  isMock?: boolean;
}

export interface VoiceProvider {
  readonly name: string;
  generate(options: VoiceGenerateOptions): Promise<VoiceResponse>;
}

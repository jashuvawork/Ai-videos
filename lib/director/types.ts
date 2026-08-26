export type ContentType =
  | "manufacturing"
  | "food_process"
  | "documentary"
  | "narrative"
  | "travel"
  | "motivational";

export type DirectorInput = {
  idea: string;
  duration: number;
  language: string;
  tone: string;
  platform: string;
  visualStyle: string;
  generationMode: string;
  aspectRatio?: string;
  voice?: string;
  videoType?: string;
};

export type SceneTemplate = {
  key: string;
  purpose: string;
  narration: string;
  visualDescription: string;
  cameraMovement: string;
  cameraAngle: string;
  lighting: string;
  environment: string;
  soundEffects: string[];
  musicMood: string;
  caption: string;
  emotion: string;
  transition: string;
  /** Higher priority scenes are kept when duration requires fewer scenes */
  priority: number;
};

export type ContinuityBible = {
  productName?: string;
  productVisual: string;
  environmentVisual: string;
  workerVisual: string;
  machineVisual: string;
  brandName?: string;
  packagingVisual?: string;
  characterVisual?: string;
  negativePromptBase: string;
  contentType: ContentType;
  /** Hyper-realistic continuity engine tokens */
  phoneIdentity?: string;
  factoryIdentity?: string;
  characterIdentity?: string;
  productReference?: string;
  captureMedium?: string;
  lensCharacter?: string;
};

export type DirectorStory = {
  title: string;
  hook: string;
  summary: string;
  duration: number;
  tone: string;
  characters: Array<Record<string, unknown>>;
  scenes: Array<{
    sceneNumber: number;
    duration: number;
    narration: string;
    dialogue: string;
    visualDescription: string;
    cameraMovement: string;
    cameraAngle: string;
    lighting: string;
    environment: string;
    soundEffects: string[];
    musicMood: string;
    caption: string;
    transition: string;
    emotion: string;
    sceneKey?: string;
  }>;
  continuity: ContinuityBible;
};

import type { SceneTemplate } from "@/lib/director/types";

export type ProcessStage = {
  key: string;
  inputState: string;
  action: string;
  outputState: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  environment: string;
  soundEffects: string[];
  musicMood: string;
  emotion: string;
  priority: number;
};

/**
 * Builds subject-specific manufacturing chains with input → action → output continuity.
 */
export class ProcessContinuityService {
  buildChain(idea: string): ProcessStage[] {
    const subject = detectProcessSubject(idea);
    if (subject === "biscuits") return BISCUIT_PROCESS;
    if (subject === "chocolate") return CHOCOLATE_PROCESS;
    if (subject === "smartphone" || subject === "generic_manufacturing") return [];
    return GENERIC_FOOD_PROCESS(subject, idea);
  }

  toSceneTemplates(stages: ProcessStage[]): SceneTemplate[] {
    return stages.map((stage) => ({
      key: stage.key,
      purpose: stage.action,
      priority: stage.priority,
      narration: describeNarration(stage),
      visualDescription: buildProcessVisual(stage),
      cameraMovement: stage.cameraMovement,
      cameraAngle: stage.cameraAngle,
      lighting: stage.lighting,
      environment: stage.environment,
      soundEffects: stage.soundEffects,
      musicMood: stage.musicMood,
      caption: "",
      emotion: stage.emotion,
      transition: "cut",
    }));
  }

  getTemplatesForIdea(idea: string): SceneTemplate[] | null {
    const subject = detectProcessSubject(idea);
    if (subject === "smartphone" || subject === "generic_manufacturing") return null;
    const chain = this.buildChain(idea);
    if (chain.length === 0) return null;
    return this.toSceneTemplates(chain);
  }
}

function describeNarration(stage: ProcessStage): string {
  return `${stage.action.replace(/\.$/, "")}.`;
}

function buildProcessVisual(stage: ProcessStage): string {
  return [
    `INPUT: ${stage.inputState}.`,
    `ACTION: ${stage.action}.`,
    `OUTPUT: ${stage.outputState}.`,
    "Industrial food-grade factory, stainless steel surfaces, realistic material physics, workers in protective clothing actively operating equipment, no portraits posing at camera.",
  ].join(" ");
}

export function detectProcessSubject(idea: string): string {
  const t = idea.toLowerCase();
  if (/\b(biscuits?|cookies?|crackers?)\b/.test(t)) return "biscuits";
  if (/\b(smartphones?|mobile phones?|cell phones?|phone making)\b/.test(t)) return "smartphone";
  if (/\b(chocolate|cocoa)\b/.test(t)) return "chocolate";
  if (/\b(bread|pizza|pasta|cakes?)\b/.test(t)) return t.match(/\b(bread|pizza|pasta|cakes?)\b/)![1];
  if (/\b(factory|manufactur|assembly|production)\b/.test(t)) return "generic_manufacturing";
  return "generic_food";
}

const BISCUIT_PROCESS: ProcessStage[] = [
  {
    key: "raw_receiving",
    inputState: "Flour, sugar, butter, and other biscuit ingredients in bulk sacks on pallets",
    action:
      "Workers unload ingredient sacks onto stainless receiving conveyor while forklift delivers next pallet",
    outputState: "Ingredient sacks queued at inspection station",
    cameraAngle: "wide factory shot",
    cameraMovement: "slow lateral tracking along receiving line",
    lighting: "bright industrial warehouse lighting",
    environment: "food factory raw material receiving bay",
    soundEffects: ["forklift", "conveyor"],
    musicMood: "industrial",
    emotion: "active",
    priority: 1,
  },
  {
    key: "ingredient_inspection",
    inputState: "Queued ingredient sacks and trays",
    action:
      "QC worker opens sack, scoops flour sample, inspects under lamp, marks tray pass and slides to prep",
    outputState: "Approved ingredients on prep conveyor",
    cameraAngle: "medium close-up inspection",
    cameraMovement: "subtle push-in on hands and sample",
    lighting: "focused inspection lamp",
    environment: "ingredient QC station",
    soundEffects: ["scoops", "conveyor"],
    musicMood: "meticulous",
    emotion: "careful",
    priority: 1,
  },
  {
    key: "measuring",
    inputState: "Approved flour, sugar, butter portions",
    action:
      "Automated dispensers measure ingredients into stainless hopper, scales flash weights, gates release measured batches",
    outputState: "Precisely measured ingredients in mixing hopper",
    cameraAngle: "close-up macro dispensers",
    cameraMovement: "static with micro documentary drift",
    lighting: "clean food-grade LED",
    environment: "automated ingredient measurement station",
    soundEffects: ["dispenser clicks", "hopper fill"],
    musicMood: "precise",
    emotion: "precise",
    priority: 2,
  },
  {
    key: "mixing",
    inputState: "Measured ingredients in industrial mixer bowl",
    action:
      "Stainless mixing blades rotate continuously through thick biscuit dough, dough folds and stretches around paddles, worker monitors through inspection window",
    outputState: "Uniform mixed dough ready for processing",
    cameraAngle: "medium close-up mixer chamber",
    cameraMovement: "subtle push-in toward rotating paddles",
    lighting: "bright controlled mixing area lighting",
    environment: "industrial dough mixing room",
    soundEffects: ["mixer motor", "dough fold"],
    musicMood: "rhythmic",
    emotion: "intense",
    priority: 1,
  },
  {
    key: "dough_rolling",
    inputState: "Freshly mixed dough mass",
    action:
      "Dough enters rolling machine, rollers compress dough into continuous sheet emerging at steady speed",
    outputState: "Continuous sheet of rolled dough on conveyor",
    cameraAngle: "side tracking shot",
    cameraMovement: "slow lateral tracking following dough sheet",
    lighting: "even production floor lighting",
    environment: "dough rolling line",
    soundEffects: ["roller hum", "dough sheet"],
    musicMood: "flowing",
    emotion: "rhythmic",
    priority: 1,
  },
  {
    key: "cutting_forming",
    inputState: "Rolled dough sheet on moving belt",
    action:
      "Rotating cutters stamp round biscuit shapes, excess dough recycles, uniform pieces transfer onto baking conveyor",
    outputState: "Rows of identical raw biscuit pieces on green conveyor",
    cameraAngle: "overhead production shot",
    cameraMovement: "overhead tracking along cutter",
    lighting: "bright food production lighting",
    environment: "biscuit forming station",
    soundEffects: ["cutter press", "conveyor"],
    musicMood: "rhythmic",
    emotion: "satisfying",
    priority: 1,
  },
  {
    key: "baking",
    inputState: "Raw biscuit pieces on oven infeed conveyor",
    action:
      "Rows of biscuits advance into industrial tunnel oven, heat shimmer visible, biscuits slowly brown as they travel through oven chamber",
    outputState: "Golden baked biscuits exiting oven on outfeed belt",
    cameraAngle: "low-angle tracking into oven",
    cameraMovement: "tracking shot following biscuits entering oven",
    lighting: "warm oven glow mixed with overhead factory LEDs",
    environment: "industrial baking tunnel oven line",
    soundEffects: ["oven fan", "conveyor"],
    musicMood: "warm",
    emotion: "transforming",
    priority: 1,
  },
  {
    key: "cooling",
    inputState: "Hot baked biscuits on outfeed conveyor",
    action:
      "Biscuits travel through open cooling conveyor, gentle fans, steam fading, texture settling",
    outputState: "Cooled firm biscuits ready for inspection",
    cameraAngle: "wide medium cooling line",
    cameraMovement: "slow pan along cooling racks",
    lighting: "cool neutral factory light",
    environment: "cooling conveyor tunnel",
    soundEffects: ["fan hum", "conveyor"],
    musicMood: "calm",
    emotion: "patient",
    priority: 2,
  },
  {
    key: "quality_inspection",
    inputState: "Cooled biscuits on inspection belt",
    action:
      "Inspector picks sample biscuit, breaks it checking crumb, passes tray while automated camera scans rows for defects",
    outputState: "Approved biscuits continuing to packaging",
    cameraAngle: "close-up inspection shot",
    cameraMovement: "static close-up on hands breaking biscuit",
    lighting: "strong QC inspection lighting",
    environment: "quality inspection station",
    soundEffects: ["snap", "conveyor"],
    musicMood: "assured",
    emotion: "confident",
    priority: 1,
  },
  {
    key: "packaging",
    inputState: "Approved biscuits on packaging infeed",
    action:
      "Automated counter drops biscuits into flow wrapper, film seals around stack, cutter separates packets, packets accumulate in carton",
    outputState: "Sealed biscuit packets in shipping carton",
    cameraAngle: "close-up tracking packaging line",
    cameraMovement: "close-up tracking following packets through wrapper",
    lighting: "bright packaging area lighting",
    environment: "automated biscuit packaging line",
    soundEffects: ["wrapper seal", "conveyor"],
    musicMood: "efficient",
    emotion: "complete",
    priority: 1,
  },
  {
    key: "finished_product",
    inputState: "Sealed biscuit packets on outbound conveyor",
    action:
      "Cartons of finished biscuits move on outbound conveyor past active production lines in background",
    outputState: "Stacked cartons ready for distribution",
    cameraAngle: "low-angle tracking along conveyor",
    cameraMovement: "slow documentary tracking along outbound belt",
    lighting: "realistic factory lighting with warm product tones",
    environment: "outbound logistics conveyor",
    soundEffects: ["conveyor", "factory ambience"],
    musicMood: "subtle triumph",
    emotion: "complete",
    priority: 1,
  },
];

const CHOCOLATE_PROCESS: ProcessStage[] = [
  {
    key: "cocoa_receiving",
    inputState: "Cocoa beans in bulk sacks",
    action: "Workers pour cocoa beans into stainless receiving hopper, beans cascade through grate",
    outputState: "Beans in cleaning conveyor",
    cameraAngle: "medium factory shot",
    cameraMovement: "tracking along hopper feed",
    lighting: "industrial warehouse lighting",
    environment: "cocoa receiving area",
    soundEffects: ["beans pouring", "conveyor"],
    musicMood: "industrial",
    emotion: "active",
    priority: 1,
  },
  {
    key: "roasting",
    inputState: "Cleaned cocoa beans",
    action: "Beans tumble in rotating roast drum, heat glow visible through inspection port",
    outputState: "Roasted beans discharged to cooling tray",
    cameraAngle: "side close-up roast drum",
    cameraMovement: "static with subtle vibration feel",
    lighting: "warm roast glow",
    environment: "cocoa roasting room",
    soundEffects: ["drum rotate", "beans tumble"],
    musicMood: "warm",
    emotion: "intense",
    priority: 1,
  },
  {
    key: "grinding",
    inputState: "Roasted cocoa nibs",
    action: "Nibs enter stone grinder, viscous chocolate liquor flows from outlet pipe into stainless vessel",
    outputState: "Liquid chocolate base in holding tank",
    cameraAngle: "close-up macro flow",
    cameraMovement: "macro push-in on flowing liquor",
    lighting: "warm product lighting",
    environment: "grinding and refining room",
    soundEffects: ["grinder hum", "liquid flow"],
    musicMood: "rich",
    emotion: "transforming",
    priority: 1,
  },
  {
    key: "molding",
    inputState: "Tempered chocolate in depositor",
    action: "Depositor fills mold trays with precise chocolate shots, molds vibrate to level",
    outputState: "Molded chocolate bars on cooling conveyor",
    cameraAngle: "overhead molding line",
    cameraMovement: "overhead tracking",
    lighting: "clean production lighting",
    environment: "chocolate molding line",
    soundEffects: ["depositor", "vibration"],
    musicMood: "rhythmic",
    emotion: "precise",
    priority: 1,
  },
  {
    key: "packaging",
    inputState: "Cooled chocolate bars",
    action: "Bars enter wrapper, foil seals, cartoner loads boxes onto pallet",
    outputState: "Cartoned chocolate products on outbound conveyor",
    cameraAngle: "tracking packaging line",
    cameraMovement: "lateral tracking",
    lighting: "commercial packaging light",
    environment: "chocolate packaging department",
    soundEffects: ["wrapper", "conveyor"],
    musicMood: "efficient",
    emotion: "complete",
    priority: 1,
  },
  {
    key: "finished_product",
    inputState: "Cartoned chocolate on outbound belt",
    action: "Finished cartons advance on conveyor with active production visible behind",
    outputState: "Pallet of finished chocolate products",
    cameraAngle: "low-angle tracking",
    cameraMovement: "slow documentary dolly",
    lighting: "warm factory lighting",
    environment: "outbound conveyor",
    soundEffects: ["conveyor"],
    musicMood: "complete",
    emotion: "satisfied",
    priority: 1,
  },
];

function GENERIC_FOOD_PROCESS(subject: string, idea: string): ProcessStage[] {
  const product = subject.replace(/_/g, " ");
  return [
    {
      key: "prep",
      inputState: `Raw ingredients for ${product}`,
      action: `Workers wash, sort, and feed ingredients into stainless prep tables and conveyors`,
      outputState: `Prepared ingredients ready for processing`,
      cameraAngle: "medium worker shot",
      cameraMovement: "tracking along prep tables",
      lighting: "bright hygienic lighting",
      environment: `${product} preparation room`,
      soundEffects: ["prep sounds", "conveyor"],
      musicMood: "methodical",
      emotion: "careful",
      priority: 1,
    },
    {
      key: "processing",
      inputState: `Prepared ingredients for ${product}`,
      action: `Industrial machines mix, heat, or process materials with visible mechanical motion and realistic steam`,
      outputState: `Processed ${product} material on production line`,
      cameraAngle: "medium machine shot",
      cameraMovement: "side tracking on active machinery",
      lighting: "warm industrial processing light",
      environment: `${product} processing floor`,
      soundEffects: ["machine hum", "steam"],
      musicMood: "industrial",
      emotion: "active",
      priority: 1,
    },
    {
      key: "forming",
      inputState: `Processed ${product} material`,
      action: `Forming machines shape product while conveyor carries uniform pieces forward`,
      outputState: `Formed ${product} pieces on conveyor`,
      cameraAngle: "overhead conveyor shot",
      cameraMovement: "overhead tracking",
      lighting: "clean production lighting",
      environment: "forming station",
      soundEffects: ["machine press", "conveyor"],
      musicMood: "rhythmic",
      emotion: "rhythmic",
      priority: 1,
    },
    {
      key: "packaging",
      inputState: `Finished ${product} pieces`,
      action: `Automated line wraps and boxes products, mechanical arms stack cartons`,
      outputState: `Packaged ${product} on outbound conveyor`,
      cameraAngle: "tracking packaging line",
      cameraMovement: "close-up tracking",
      lighting: "bright packaging lighting",
      environment: "packaging department",
      soundEffects: ["wrapper", "conveyor"],
      musicMood: "efficient",
      emotion: "complete",
      priority: 1,
    },
    {
      key: "finished",
      inputState: `Packaged ${product}`,
      action: `Products move on outbound conveyor through active factory floor`,
      outputState: `Finished ${product} ready for shipping`,
      cameraAngle: "low-angle tracking",
      cameraMovement: "slow documentary tracking",
      lighting: "realistic factory lighting",
      environment: "outbound line",
      soundEffects: ["conveyor"],
      musicMood: "complete",
      emotion: "satisfied",
      priority: 1,
    },
  ];
}

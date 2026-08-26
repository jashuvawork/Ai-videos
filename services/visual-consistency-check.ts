import { validateSceneDescription } from "@/lib/director/no-text";
import type { SceneData } from "@/lib/schemas";
import type { ReferenceStyleProfile } from "@/lib/schemas/reference-style";

export type VisualConsistencyResult = {
  valid: boolean;
  issues: string[];
  sceneNumber?: number;
};

const PORTRAIT_BIAS_PATTERNS = [
  /\bportrait\b/i,
  /\bwoman\b.*\blooking at camera\b/i,
  /\bfashion model\b/i,
  /\bbeauty shot\b/i,
  /\bglamour\b/i,
  /\bemotional close-up of (a )?woman\b/i,
];

const TITLE_CARD_PATTERNS = [
  /\bgradient (background|card|slide)\b/i,
  /\btitle card\b/i,
  /\bchapter card\b/i,
  /\binterstitial\b/i,
];

/**
 * Pre-generation quality gate — reject portrait montage / title card prompts before expensive API calls.
 */
export class VisualConsistencyCheckService {
  checkScene(
    scene: SceneData,
    options?: {
      aspectRatio?: string;
      referenceStyle?: ReferenceStyleProfile | null;
      isProcessVideo?: boolean;
    },
  ): VisualConsistencyResult {
    const issues: string[] = [];
    const visual =
      (scene as SceneData & { visualPrompt?: string }).visualPrompt || scene.visualDescription || "";
    const narration = scene.narration || "";

    const validation = validateSceneDescription(visual);
    if (!validation.valid) issues.push(...validation.issues);

    if (options?.isProcessVideo) {
      for (const pattern of PORTRAIT_BIAS_PATTERNS) {
        if (pattern.test(visual) || pattern.test(narration)) {
          issues.push(`Portrait bias detected: ${pattern.source}`);
        }
      }
      for (const pattern of TITLE_CARD_PATTERNS) {
        if (pattern.test(visual)) {
          issues.push(`Title card / gradient slide pattern: ${pattern.source}`);
        }
      }
      if (!/factory|conveyor|machine|mixer|oven|worker|industrial|stainless|production|assembly|biscuit|dough|ingredient/i.test(visual)) {
        issues.push("Missing industrial/process action keywords in visual prompt");
      }
    }

    if (scene.caption && scene.caption.trim().length > 0) {
      issues.push("Scene caption must be empty for process videos (no on-screen text)");
    }

    if (options?.aspectRatio?.includes("9_16") || options?.aspectRatio?.includes("9:16")) {
      if (/landscape widescreen only/i.test(visual)) {
        issues.push("Vertical safe-area composition required for 9:16");
      }
    }

    if (options?.referenceStyle) {
      const neg = options.referenceStyle.negativeStyleElements.join(" ").toLowerCase();
      if (neg.includes("portrait") && PORTRAIT_BIAS_PATTERNS.some((p) => p.test(visual))) {
        issues.push("Visual prompt conflicts with reference negative style (portrait montage)");
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      sceneNumber: scene.sceneNumber,
    };
  }

  repairPrompt(visual: string, isProcessVideo?: boolean): string {
    let repaired = visual;
    if (isProcessVideo) {
      repaired = repaired.replace(/\b(portrait|model looking at camera)\b/gi, "worker operating equipment");
      if (!/no visible text|no titles/i.test(repaired)) {
        repaired += ". Zero visible text on screen. Active industrial factory action only.";
      }
      if (!/conveyor|machine|worker|stainless|industrial/i.test(repaired)) {
        repaired +=
          ". Industrial factory floor with stainless equipment, workers handling materials, conveyor in motion.";
      }
    }
    return repaired;
  }
}

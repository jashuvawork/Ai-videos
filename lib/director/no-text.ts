/**
 * Hyper-realistic visual generation rules + scene quality checks.
 */
export const ABSOLUTE_NEGATIVE_PROMPT =
  "text, captions, subtitles, title cards, chapter cards, typography, words, labels, presentation slides, colored backgrounds, blank screens, watermarks, fake logos, floating objects, teleportation, object morphing, object duplication, disappearing objects, impossible physics, unrealistic machinery, unrealistic robotic movement, distorted humans, extra fingers, deformed hands, distorted faces, CGI look, cartoon look, plastic-looking materials, fake factory, static scenes, meaningless shots, inconsistent product, inconsistent characters, inconsistent environment, excessive camera movement, impossible camera movement, artificial transitions, glowing effects, random visual changes, half CGI look, AI slideshow, stock montage, spinning transitions, objects flying into place";

export const NO_TEXT_VISUAL_SUFFIX =
  "zero visible text on screen, no titles labels captions typography, real documentary footage not presentation, active physical action entire shot";

export const REAL_WORLD_ACTION_SUFFIX =
  "believable cause and effect physical interaction: grip lift place release, machine cycles with realistic acceleration, conveyor carries object to next station";

export const HYPER_REALISM_SUFFIX =
  "hyper-realistic believable documentary footage, looks filmed on real camera in real location, not AI slideshow not animation";

/** Patterns that indicate broken or wrong scene prompts */
const TITLE_CARD_PATTERNS = [
  /\bRAW MATERIALS\b/i,
  /\bCOMPONENT MANUFACTURING\b/i,
  /\bPCB PRODUCTION\b/i,
  /\btitle card\b/i,
  /\bchapter card\b/i,
  /\btext overlay\b/i,
  /\bcolored background\b/i,
  /\bblank screen\b/i,
];

const STATIC_SHOT_PATTERNS = [
  /\bsitting on a table\b/i,
  /\bstatic product\b/i,
  /\bfloating in space\b/i,
  /\bno motion\b/i,
  /\bstanding beside.*looking at camera\b/i,
];

export type SceneValidationResult = {
  valid: boolean;
  issues: string[];
};

export function validateSceneDescription(description: string): SceneValidationResult {
  const issues: string[] = [];

  for (const pattern of TITLE_CARD_PATTERNS) {
    if (pattern.test(description)) {
      issues.push(`Contains title-card or label pattern: ${pattern.source}`);
    }
  }

  for (const pattern of STATIC_SHOT_PATTERNS) {
    if (pattern.test(description)) {
      issues.push(`Static or non-action pattern: ${pattern.source}`);
    }
  }

  if (description.length < 40) {
    issues.push("Visual description too short for hyper-realistic action");
  }

  const actionSignals = /robot|conveyor|worker|grip|place|machine|install|press|cut|inspect|move|carry|torque|clamp/i;
  if (!actionSignals.test(description)) {
    issues.push("Missing clear physical action signals");
  }

  return { valid: issues.length === 0, issues };
}

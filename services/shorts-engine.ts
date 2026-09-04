import type { StoryPlan } from "@/lib/story-studio/schemas";

export interface ShortConcept {
  id: string;
  title: string;
  description: string;
  startSceneIndex: number;
  durationSeconds: number;
  hook: string;
}

export function generateShortsFromPlan(plan: StoryPlan, count = 5): ShortConcept[] {
  const candidates = plan.scenes
    .map((scene, index) => ({
      index,
      scene,
      score:
        (scene.emotion.toLowerCase().includes("shock") ? 3 : 0) +
        (scene.emotion.toLowerCase().includes("fear") ? 2 : 0) +
        (scene.purpose.toLowerCase().includes("twist") ? 3 : 0) +
        (scene.purpose.toLowerCase().includes("hook") ? 4 : 0) +
        (scene.dialogue.length > 0 ? 1 : 0) +
        (scene.duration <= 15 ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score);

  const picks = candidates.slice(0, Math.min(count, candidates.length));
  return picks.map((pick, i) => {
    const duration = Math.min(60, Math.max(20, Math.round(pick.scene.duration * 2)));
    const hook =
      pick.scene.narration?.slice(0, 80) ||
      pick.scene.dialogue[0]?.text?.slice(0, 80) ||
      pick.scene.purpose;

    return {
      id: `short-${i + 1}`,
      title: `${plan.title} — ${pick.scene.purpose.slice(0, 40)}`,
      description: `${plan.logline}\n\n#shorts #${plan.genre.replace(/\s+/g, "")}`,
      startSceneIndex: pick.index,
      durationSeconds: duration,
      hook,
    };
  });
}

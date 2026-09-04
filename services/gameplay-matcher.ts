import type { StoryScene } from "@/lib/story-studio/schemas";

export interface GameplayClipForMatch {
  id: string;
  tags: string[];
  metadata: Record<string, unknown> | null;
  duration: number | null;
}

export interface GameplayMatchResult {
  clipId: string;
  score: number;
  reasons: string[];
}

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function tagOverlap(clipTags: string[], terms: string[]): number {
  const normalizedTags = clipTags.map(normalize);
  let hits = 0;
  for (const term of terms) {
    const t = normalize(term);
    if (normalizedTags.some((tag) => tag.includes(t) || t.includes(tag))) hits++;
  }
  return hits;
}

export function scoreClipForScene(clip: GameplayClipForMatch, scene: StoryScene): GameplayMatchResult {
  const reasons: string[] = [];
  let score = 0;

  const terms = scene.gameplaySearchTerms ?? [];
  const tagHits = tagOverlap(clip.tags, terms);
  if (tagHits > 0) {
    const pts = Math.min(50, tagHits * 15);
    score += pts;
    reasons.push(`Tag match +${pts}`);
  }

  const meta = (clip.metadata ?? {}) as Record<string, string | string[]>;
  const sceneLoc = normalize(scene.location);
  const clipLoc = normalize(String(meta.location ?? ""));
  if (clipLoc && sceneLoc && (clipLoc.includes(sceneLoc) || sceneLoc.includes(clipLoc))) {
    score += 15;
    reasons.push("Location match +15");
  }

  const sceneTime = normalize(scene.timeOfDay);
  const clipTime = normalize(String(meta.timeOfDay ?? ""));
  if (clipTime && sceneTime && clipTime === sceneTime) {
    score += 10;
    reasons.push("Time-of-day match +10");
  }

  const sceneWeather = normalize(scene.weather ?? "");
  const clipWeather = normalize(String(meta.weather ?? ""));
  if (sceneWeather && clipWeather && clipWeather === sceneWeather) {
    score += 8;
    reasons.push("Weather match +8");
  }

  const sceneMood = normalize(scene.emotion);
  const clipMood = normalize(String(meta.mood ?? ""));
  if (clipMood && sceneMood && (clipMood.includes(sceneMood) || sceneMood.includes(clipMood))) {
    score += 7;
    reasons.push("Mood match +7");
  }

  if (clip.duration && scene.duration) {
    const ratio = Math.min(clip.duration, scene.duration) / Math.max(clip.duration, scene.duration);
    const pts = Math.round(ratio * 10);
    score += pts;
    if (pts > 0) reasons.push(`Duration fit +${pts}`);
  }

  return { clipId: clip.id, score: Math.min(100, score), reasons };
}

export function findBestGameplayMatch(
  clips: GameplayClipForMatch[],
  scene: StoryScene,
  minScore = 35,
): GameplayMatchResult | null {
  if (scene.aiVideoRequired || clips.length === 0) return null;

  const ranked = clips
    .map((clip) => scoreClipForScene(clip, scene))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || best.score < minScore) return null;
  return best;
}

export function rankGameplayMatches(
  clips: GameplayClipForMatch[],
  scene: StoryScene,
): GameplayMatchResult[] {
  return clips.map((clip) => scoreClipForScene(clip, scene)).sort((a, b) => b.score - a.score);
}

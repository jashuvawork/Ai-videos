/**
 * Scene count scales with target duration per master director guidelines.
 * 30s → 8–10, 60s → 12–15, 120s → 18–25, 300s+ → 30+
 */
export function calculateSceneCount(duration: number, _generationMode: string): number {
  if (duration <= 30) {
    return clamp(Math.round(duration / 3.5), 8, 10);
  }
  if (duration <= 60) {
    return clamp(Math.round(duration / 4), 12, 15);
  }
  if (duration <= 120) {
    return clamp(Math.round(duration / 5), 18, 25);
  }
  if (duration <= 300) {
    return clamp(Math.round(duration / 5), 30, 40);
  }
  return clamp(Math.round(duration / 5), 30, 50);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

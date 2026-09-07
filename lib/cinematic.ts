/**
 * Look language and edit math for social-ready story videos:
 * photoreal picture of the story, voiceover-led narrative, no burned-in captions.
 */

export const CROSSFADE_SECONDS = 0.45;

/** Style only — never mention cameras/film gear or models draw the equipment. */
export const SOCIAL_STORY_LOOK =
  "photoreal live-action movie scene of this exact moment, natural skin texture, real pores, shallow depth of field, motivated practical lighting, rich color, grounded physics, people and places filling the frame";

export const SOCIAL_STORY_NO_TEXT =
  "no text, no subtitles, no captions, no titles, no watermarks, no logos, no lower thirds, no typography on screen";

export const SOCIAL_STORY_NEGATIVE =
  "subtitles, captions, title card, watermark, logo, text overlay, comic font, AI slideshow, plastic skin, extra fingers, deformed face, cartoon, illustration, stock montage, cinema camera body, DSLR in frame, tripod, gimbal, behind the scenes, film equipment, clapperboard";

/** Light grade only — heavy vignette + double EQ crushed previous exports. */
export const FILM_LOOK_FILTER =
  "eq=contrast=1.03:saturation=1.04:gamma=1.04:brightness=0.03,unsharp=5:5:0.2:5:5:0.0,vignette=PI/10,noise=alls=2:allf=t";

export function sceneStartTimes(durations: number[], fadeSeconds = CROSSFADE_SECONDS): number[] {
  if (durations.length === 0) return [];
  const fade = durations.length > 1 ? fadeSeconds : 0;
  const starts = [0];
  for (let i = 1; i < durations.length; i++) {
    const prev = Math.max(0.1, durations[i - 1] - fade);
    starts.push(Number((starts[i - 1] + prev).toFixed(3)));
  }
  return starts;
}

export function totalTimelineDuration(durations: number[], fadeSeconds = CROSSFADE_SECONDS): number {
  if (durations.length === 0) return 0;
  const fade = durations.length > 1 ? fadeSeconds : 0;
  const raw = durations.reduce((sum, d) => sum + d, 0) - fade * (durations.length - 1);
  return Number(Math.max(0.1, raw).toFixed(3));
}

export function buildXfadeFilter(count: number, durations: number[], fadeSeconds = CROSSFADE_SECONDS): string {
  if (count <= 1) return "[0:v]copy[v]";
  const fade = Math.min(fadeSeconds, ...durations.map((d) => Math.max(0.12, d * 0.2)));
  const parts: string[] = [];
  let last = "0:v";
  let offset = Math.max(0.05, durations[0] - fade);
  for (let i = 1; i < count; i++) {
    const out = i === count - 1 ? "v" : `xf${i}`;
    parts.push(`[${last}][${i}:v]xfade=transition=fade:duration=${fade.toFixed(3)}:offset=${offset.toFixed(3)}[${out}]`);
    last = out;
    offset += Math.max(0.05, durations[i] - fade);
  }
  return parts.join(";");
}

export function cinematicStoryVisualPrompt(params: {
  visual: string;
  camera?: string;
  location?: string;
  timeOfDay?: string;
  characters?: Array<{ name: string; description: string }>;
}): string {
  const lock = (params.characters ?? [])
    .slice(0, 4)
    .map((c) => `${c.name} (${c.description})`)
    .join("; ");

  return [
    `SCENE: ${params.visual}`,
    lock ? `same faces and wardrobe throughout: ${lock}` : "",
    params.camera ? `viewpoint: ${params.camera}` : "",
    params.location ? `location: ${params.location}` : "",
    params.timeOfDay ? `time of day: ${params.timeOfDay}` : "",
    SOCIAL_STORY_LOOK,
    SOCIAL_STORY_NO_TEXT,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Keep Pollinations requests inside its size cap without breaking 9:16 / 16:9. */
export function pollinationsFrameSize(width: number, height: number, maxEdge = 1280): { width: number; height: number } {
  const w = Math.max(256, width);
  const h = Math.max(256, height);
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return {
    width: Math.max(256, Math.round(w * scale)),
    height: Math.max(256, Math.round(h * scale)),
  };
}

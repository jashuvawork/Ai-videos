/**
 * Look language and edit math for social-ready story videos:
 * photorealistic picture, voiceover-led narrative, no burned-in captions.
 */

export const CROSSFADE_SECONDS = 0.45;

export const SOCIAL_STORY_LOOK =
  "photorealistic cinematic film still, shot on 35mm, natural skin texture, real pores, shallow depth of field, anamorphic bokeh, motivated practical lighting, rich color, grounded physics, looks like a real movie scene uploaded to YouTube or Instagram";

export const SOCIAL_STORY_NO_TEXT =
  "no text, no subtitles, no captions, no titles, no watermarks, no logos, no lower thirds, no typography on screen";

export const SOCIAL_STORY_NEGATIVE =
  "subtitles, captions, title card, watermark, logo, text overlay, comic font, AI slideshow, plastic skin, extra fingers, deformed face, cartoon, illustration, stock montage";

export const FILM_LOOK_FILTER =
  "eq=contrast=1.07:saturation=0.94:gamma=0.99:gamma_r=1.01:gamma_b=0.98,unsharp=5:5:0.32:5:5:0.0,vignette=PI/5,noise=alls=3:allf=t";

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
    params.visual,
    lock ? `same faces and wardrobe throughout: ${lock}` : "",
    params.camera ? `camera: ${params.camera}` : "",
    params.location ? `location: ${params.location}` : "",
    params.timeOfDay ? `time of day: ${params.timeOfDay}` : "",
    SOCIAL_STORY_LOOK,
    SOCIAL_STORY_NO_TEXT,
  ]
    .filter(Boolean)
    .join(", ");
}

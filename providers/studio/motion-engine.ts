/**
 * Maps documentary camera language to FFmpeg motion filters with visible real-world movement.
 */

export type MotionPreset = {
  key: string;
  /** zoompan filter fragment (d= placeholder replaced at runtime) */
  zoompan: string;
};

const MOTION_PRESETS: Record<string, MotionPreset> = {
  "slow zoom in": {
    key: "slow zoom in",
    zoompan:
      "zoompan=z='min(zoom+0.002,1.35)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "slow zoom out": {
    key: "slow zoom out",
    zoompan:
      "zoompan=z='if(lte(zoom,1.0),1.35,max(1.001,zoom-0.002))':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "slow pan left": {
    key: "slow pan left",
    zoompan:
      "zoompan=z='1.12':d=125:x='if(gte(on,1),x-2,x)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "slow pan right": {
    key: "slow pan right",
    zoompan:
      "zoompan=z='1.12':d=125:x='if(gte(on,1),x+2,x)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "push in": {
    key: "push in",
    zoompan:
      "zoompan=z='min(zoom+0.003,1.45)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "pull out": {
    key: "pull out",
    zoompan:
      "zoompan=z='if(lte(zoom,1.0),1.45,max(1.001,zoom-0.003))':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "vertical pan": {
    key: "vertical pan",
    zoompan:
      "zoompan=z='1.12':d=125:x='iw/2-(iw/zoom/2)':y='if(gte(on,1),y-2,y)':s={w}x{h}",
  },
  "tracking lateral": {
    key: "tracking lateral",
    zoompan:
      "zoompan=z='1.18':d=125:x='if(gte(on,1),x+3,x)':y='ih/2-(ih/zoom/2)':s={w}x{h}",
  },
  "overhead tracking": {
    key: "overhead tracking",
    zoompan:
      "zoompan=z='1.1':d=125:x='if(gte(on,1),x+2.5,x)':y='if(gte(on,1),y+1,y)':s={w}x{h}",
  },
  "handheld documentary": {
    key: "handheld documentary",
    zoompan:
      "zoompan=z='min(zoom+0.0015,1.28)':d=125:x='iw/2-(iw/zoom/2)+12*sin(on/18)':y='ih/2-(ih/zoom/2)+8*sin(on/24)':s={w}x{h}",
  },
  "documentary drift": {
    key: "documentary drift",
    zoompan:
      "zoompan=z='1.08':d=125:x='iw/2-(iw/zoom/2)+6*sin(on/40)':y='ih/2-(ih/zoom/2)+4*sin(on/55)':s={w}x{h}",
  },
};

/** Fuzzy match camera-engine / scene strings to a motion preset */
export function resolveCameraMovement(input?: string): string {
  const t = (input || "").toLowerCase();
  if (!t) return "documentary drift";

  if (t.includes("lateral tracking") || t.includes("tracking along") || t.includes("following product")) {
    return "tracking lateral";
  }
  if (t.includes("overhead tracking") || t.includes("overhead")) return "overhead tracking";
  if (t.includes("handheld") || t.includes("micro-movement") || t.includes("micro drift")) {
    return "handheld documentary";
  }
  if (t.includes("push-in") || t.includes("push in")) return "push in";
  if (t.includes("pull out") || t.includes("pull-out")) return "pull out";
  if (t.includes("pan left")) return "slow pan left";
  if (t.includes("pan right") || t.includes("tracking shot") || t.includes("tracking following")) {
    return "tracking lateral";
  }
  if (t.includes("zoom in")) return "slow zoom in";
  if (t.includes("zoom out")) return "slow zoom out";
  if (t.includes("vertical pan")) return "vertical pan";
  if (t.includes("tracking") || t.includes("conveyor")) return "tracking lateral";
  if (t.includes("static")) return "handheld documentary";

  for (const key of Object.keys(MOTION_PRESETS)) {
    if (t.includes(key)) return key;
  }

  return "documentary drift";
}

export function buildMotionFilterChain(
  width: number,
  height: number,
  totalFrames: number,
  cameraMovement?: string,
): string {
  const presetKey = resolveCameraMovement(cameraMovement);
  const preset = MOTION_PRESETS[presetKey] ?? MOTION_PRESETS["documentary drift"];
  const zoomFilter = preset.zoompan
    .replace(/\{w\}/g, String(width))
    .replace(/\{h\}/g, String(height))
    .replace("d=125", `d=${totalFrames}`);

  return [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    zoomFilter,
    "noise=c0s=8:c0f=t+u",
    "eq=contrast=1.03:saturation=1.02",
  ].join(",");
}

export const LEGACY_CAMERA_MOVEMENTS: Record<string, string> = Object.fromEntries(
  Object.entries(MOTION_PRESETS).map(([k, v]) => [k, v.zoompan]),
);

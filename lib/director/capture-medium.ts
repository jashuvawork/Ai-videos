/**
 * Hyper-realistic capture medium descriptors.
 * Inspired by documentary hyperrealism: define HOW footage was captured, not just what it shows.
 */
export const DOCUMENTARY_CAPTURE_MEDIUM =
  "high-end real-world documentary footage, professional cinema camera documentary crew perspective, 35mm film aesthetic, natural color grading, subtle organic film grain, realistic motion blur, believable lens characteristics";

export const INDUSTRIAL_DOCUMENTARY_CAPTURE =
  "industrial documentary filmed inside a real factory, professional documentary cinematography, controlled camera movement, static or slow tracking shot, not excessive drone or spinning, one or two subjects with simple deliberate physical motion";

export const SIMPLE_MOTION_DIRECTIVE =
  "single focused action, one or two subjects maximum, one or two simple physical movements, minimal camera movement, static camera or slow tracking only, no morphing teleportation or impossible zoom";

export const NATURAL_IMPERFECTION_DIRECTIVE =
  "subtle documentary realism: tiny scratches on fixtures, visible cables and trays, slight machine vibration, natural hand grip, realistic depth of field, not overly sterile or CGI-perfect";

export function captureMediumForContent(contentType: string): string {
  if (contentType === "manufacturing" || contentType === "food_process") {
    return `${DOCUMENTARY_CAPTURE_MEDIUM}. ${INDUSTRIAL_DOCUMENTARY_CAPTURE}`;
  }
  return `${DOCUMENTARY_CAPTURE_MEDIUM}. cinematic documentary realism`;
}

export const DEFAULT_LENS_CHARACTER =
  "documentary lens, natural perspective, realistic focal length, shallow depth of field on close-ups, physically accurate focus falloff";

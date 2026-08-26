/**
 * Hyper-realistic capture medium descriptors.
 * IMPORTANT: Never describe film crews, camera operators, or BTS equipment —
 * image models interpret that as "woman with cinema camera on tripod".
 */
export const FACTORY_FOOTAGE_CAPTURE =
  "photorealistic factory floor footage, active production line in motion, robotic arms PCB assembly conveyors workers operating machines, industrial LED lighting, filmed inside a real manufacturing plant";

export const INDUSTRIAL_DOCUMENTARY_CAPTURE =
  "industrial documentary shot on the factory floor showing machines materials and workers, static or slow tracking camera, subjects are products and machinery not film equipment";

export const SIMPLE_MOTION_DIRECTIVE =
  "single focused action, one or two subjects maximum, one or two simple physical movements, minimal camera movement, static camera or slow tracking only, no morphing teleportation or impossible zoom";

export const NATURAL_IMPERFECTION_DIRECTIVE =
  "subtle documentary realism: tiny scratches on fixtures, visible cables and trays, slight machine vibration, natural hand grip, realistic depth of field, not overly sterile or CGI-perfect";

/** Legacy name kept for imports — factory-first, no crew/camera-in-frame language */
export const DOCUMENTARY_CAPTURE_MEDIUM = FACTORY_FOOTAGE_CAPTURE;

export function captureMediumForContent(contentType: string): string {
  if (contentType === "manufacturing" || contentType === "food_process") {
    return `${FACTORY_FOOTAGE_CAPTURE}. ${INDUSTRIAL_DOCUMENTARY_CAPTURE}`;
  }
  return `${FACTORY_FOOTAGE_CAPTURE}. cinematic photorealistic scene`;
}

export const DEFAULT_LENS_CHARACTER =
  "documentary lens, natural perspective, realistic focal length, shallow depth of field on close-ups, physically accurate focus falloff";

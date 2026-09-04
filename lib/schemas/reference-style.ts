import { z } from "zod";

export const ReferenceStyleProfileSchema = z.object({
  aspectRatio: z.string(),
  visualStyle: z.string(),
  lighting: z.string(),
  cameraStyle: z.string(),
  shotTypes: z.array(z.string()),
  pacing: z.string(),
  colorTreatment: z.string(),
  depthOfField: z.string(),
  composition: z.string(),
  transitions: z.array(z.string()),
  realismLevel: z.string(),
  negativeStyleElements: z.array(z.string()),
});

export type ReferenceStyleProfile = z.infer<typeof ReferenceStyleProfileSchema>;

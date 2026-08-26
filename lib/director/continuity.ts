import type { ContentType, ContinuityBible } from "./types";
import { ABSOLUTE_NEGATIVE_PROMPT } from "./no-text";

const BASE_NEGATIVE = ABSOLUTE_NEGATIVE_PROMPT;

export function buildContinuityBible(contentType: ContentType, idea: string): ContinuityBible {
  if (contentType === "manufacturing") {
    return {
      contentType,
      productName: "NovaTech X9",
      brandName: "NovaTech",
      productVisual:
        "NovaTech X9 smartphone, matte midnight blue aluminum frame, 6.7 inch edge-to-edge OLED display, triple vertical camera module on back, slim bezels, consistent identical phone model in every shot, no readable branding on screen",
      environmentVisual:
        "modern high-tech smartphone manufacturing facility, bright white LED industrial lighting, clean epoxy floors, green conveyor belts, orange six-axis robotic arms actively operating",
      workerVisual:
        "factory engineers in navy blue uniforms, white safety helmets, clear safety glasses, natural realistic hands performing tasks, not standing idle",
      machineVisual:
        "precision CNC machines cutting metal, pick-and-place SMT lines running, automated optical inspection, robotic arms on realistic paths placing components with physical contact",
      packagingVisual:
        "plain minimalist white retail box without readable text, phone, cable, cardboard inserts, mechanical closing press",
      negativePromptBase: `${BASE_NEGATIVE}, random smartphone designs, inconsistent phone model, changing phone colors`,
      characterVisual: undefined,
    };
  }

  if (contentType === "food_process") {
    const subject = extractFoodSubject(idea);
    return {
      contentType,
      productName: subject,
      productVisual: `${subject}, consistent appearance, natural food textures, realistic colors, food in motion on belts or being handled`,
      environmentVisual:
        "professional food production facility, stainless steel surfaces, steam and natural motion, workers actively processing",
      workerVisual:
        "food production workers in white coats, hair nets, hygienic gloves, hands actively handling ingredients",
      machineVisual: "realistic industrial food processing equipment in continuous operation",
      negativePromptBase: `${BASE_NEGATIVE}, plastic-looking food, unrealistic food colors, static food pile`,
    };
  }

  return {
    contentType,
    productVisual: idea.split(/[.!?]/)[0].trim(),
    environmentVisual: "cinematic photorealistic environment, consistent lighting and geography, characters in motion",
    workerVisual: "realistic human characters with natural proportions and consistent wardrobe",
    machineVisual: "physically realistic objects and machinery",
    characterVisual: "protagonist with consistent face, hair, clothing, and age, physically active not posing",
    negativePromptBase: BASE_NEGATIVE,
  };
}

function extractFoodSubject(idea: string): string {
  const match = idea.match(/\b(chocolate|coffee|bread|pizza|pasta|cheese|wine|beer|cake|cookie|cocoa)\b/i);
  return match ? match[1] : "artisan food product";
}

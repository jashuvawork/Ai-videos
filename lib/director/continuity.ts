import type { ContentType, ContinuityBible } from "./types";

export function buildContinuityBible(contentType: ContentType, idea: string): ContinuityBible {
  if (contentType === "manufacturing") {
    return {
      contentType,
      productName: "NovaTech X9",
      brandName: "NovaTech",
      productVisual:
        "NovaTech X9 smartphone, matte midnight blue aluminum frame, 6.7 inch edge-to-edge OLED display, triple vertical camera module on back, slim bezels, silver NovaTech logo on back panel, consistent model across every shot",
      environmentVisual:
        "modern high-tech smartphone manufacturing facility, bright white LED industrial lighting, clean epoxy floors, green conveyor belts, orange six-axis robotic arms, glass observation windows",
      workerVisual:
        "factory engineers in navy blue uniforms, white safety helmets, clear safety glasses, natural realistic hands and faces",
      machineVisual:
        "precision CNC machines, pick-and-place SMT lines, automated optical inspection stations, realistic robotic arm motion along defined paths",
      packagingVisual:
        "minimal white NovaTech retail box with silver logo, phone, USB-C cable, documentation sleeve, protective inserts",
      negativePromptBase:
        "cartoon, animation, unrealistic factory, fantasy machinery, impossible engineering, random smartphone designs, inconsistent phone model, changing colors, floating components, duplicated components, distorted workers, extra fingers, deformed hands, broken machinery, unrealistic robotic movements, melting objects, objects appearing from nowhere, disappearing objects, inconsistent lighting, blurry product, low resolution, watermarks, fake logos",
      characterVisual: undefined,
    };
  }

  if (contentType === "food_process") {
    const subject = extractFoodSubject(idea);
    return {
      contentType,
      productName: subject,
      productVisual: `${subject}, consistent appearance, natural food textures, realistic colors throughout every scene`,
      environmentVisual:
        "professional food production facility and artisan workshop, warm natural lighting mixed with clean industrial lighting",
      workerVisual: "food production workers in white coats, hair nets, hygienic gloves, natural realistic appearance",
      machineVisual: "realistic industrial food processing equipment, stainless steel surfaces, steam and natural motion",
      negativePromptBase:
        "cartoon food, plastic-looking food, unrealistic colors, floating ingredients, distorted hands, extra fingers, messy unnatural spills, low quality, watermarks",
    };
  }

  return {
    contentType,
    productVisual: idea.split(/[.!?]/)[0].trim(),
    environmentVisual: "cinematic photorealistic environment, consistent lighting and geography across scenes",
    workerVisual: "realistic human characters with natural proportions and consistent wardrobe",
    machineVisual: "physically realistic objects and machinery",
    characterVisual: "protagonist with consistent face, hair, clothing, and age across all scenes",
    negativePromptBase:
      "deformed hands, extra fingers, duplicate person, floating objects, inconsistent character appearance, cartoon, low quality, watermark, blurry",
  };
}

function extractFoodSubject(idea: string): string {
  const match = idea.match(/\b(chocolate|coffee|bread|pizza|pasta|cheese|wine|beer|cake|cookie|cocoa)\b/i);
  return match ? match[1] : "artisan food product";
}

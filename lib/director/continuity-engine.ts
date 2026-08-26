import type { ContentType } from "./types";

export type ContinuityIdentities = {
  phoneIdentity: string;
  factoryIdentity: string;
  characterIdentity: string;
  productReference: string;
};

/**
 * Persistent visual identity tokens — PRODUCT_REFERENCE for every scene.
 */
export function buildContinuityIdentities(contentType: ContentType, idea: string): ContinuityIdentities {
  if (contentType === "manufacturing") {
    return {
      phoneIdentity:
        "PHONE_IDENTITY NovaTech X9: matte midnight blue aluminum frame, 6.7 inch edge-to-edge OLED, triple vertical rear cameras, slim bezels, volume and power buttons on right edge, identical dimensions and color in every shot",
      factoryIdentity:
        "FACTORY_IDENTITY: fictional but realistic smartphone plant, white LED industrial lighting, green conveyor belts, orange six-axis robotic arms, epoxy floors with subtle wear, cable trays, safety signage blurred unreadable, same layout throughout",
      characterIdentity:
        "CHARACTER_IDENTITY Lead Engineer: female 32, navy uniform, white safety helmet, clear glasses, dark hair tied back, same wardrobe every appearance, natural worker behavior looking at work not camera",
      productReference:
        "PRODUCT_REFERENCE NovaTech X9 midnight blue smartphone — exact same physical object design, camera layout, screen size, frame color, materials across all scenes",
    };
  }

  if (contentType === "food_process") {
    const subject = extractSubject(idea);
    return {
      phoneIdentity: `PRODUCT_IDENTITY ${subject}: consistent shape color texture across every shot`,
      factoryIdentity:
        "FACTORY_IDENTITY: professional food production facility, stainless steel, steam, hygienic workstations, same facility throughout",
      characterIdentity:
        "CHARACTER_IDENTITY production worker: white coat, hair net, gloves, consistent appearance, hands actively handling food",
      productReference: `PRODUCT_REFERENCE ${subject} — identical appearance throughout film`,
    };
  }

  return {
    phoneIdentity: `SUBJECT_IDENTITY: ${idea.split(/[.!?]/)[0].trim()}, consistent visual identity`,
    factoryIdentity: "ENVIRONMENT_IDENTITY: consistent location lighting geography across scenes",
    characterIdentity: "CHARACTER_IDENTITY: protagonist consistent face hair clothing age, natural movement not posing",
    productReference: "consistent subjects and environment throughout",
  };
}

function extractSubject(idea: string): string {
  const match = idea.match(
    /\b(chocolate|coffee|bread|pizza|pasta|cheese|wine|beer|cake|cookie|biscuit|cracker|cocoa)\b/i,
  );
  return match ? match[1] : "artisan food product";
}

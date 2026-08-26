import type { ContentType, ContinuityBible } from "./types";
import { buildContinuityIdentities } from "./continuity-engine";
import { captureMediumForContent, DEFAULT_LENS_CHARACTER } from "./capture-medium";
import { ABSOLUTE_NEGATIVE_PROMPT } from "./no-text";

export function buildContinuityBible(contentType: ContentType, idea: string): ContinuityBible {
  const identities = buildContinuityIdentities(contentType, idea);
  const captureMedium = captureMediumForContent(contentType);

  if (contentType === "manufacturing") {
    return {
      contentType,
      productName: "NovaTech X9",
      brandName: "NovaTech",
      productVisual: identities.phoneIdentity,
      environmentVisual: identities.factoryIdentity,
      workerVisual: identities.characterIdentity,
      machineVisual:
        "realistic robotic arm cycles: approach grip lift rotate place release, CNC with coolant and metal particles, SMT pick-and-place at realistic speed",
      packagingVisual: "plain white box no readable text, mechanical lid press, cable and inserts",
      phoneIdentity: identities.phoneIdentity,
      factoryIdentity: identities.factoryIdentity,
      characterIdentity: identities.characterIdentity,
      productReference: identities.productReference,
      captureMedium,
      lensCharacter: DEFAULT_LENS_CHARACTER,
      negativePromptBase: `${ABSOLUTE_NEGATIVE_PROMPT}, inconsistent NovaTech X9 design, changing phone color`,
      characterVisual: undefined,
    };
  }

  if (contentType === "food_process") {
    const subject = identities.productReference;
    return {
      contentType,
      productName: subject.replace("PRODUCT_REFERENCE ", "").split(" —")[0],
      productVisual: identities.phoneIdentity,
      environmentVisual: identities.factoryIdentity,
      workerVisual: identities.characterIdentity,
      machineVisual: "industrial food equipment in continuous realistic operation",
      phoneIdentity: identities.phoneIdentity,
      factoryIdentity: identities.factoryIdentity,
      characterIdentity: identities.characterIdentity,
      productReference: identities.productReference,
      captureMedium,
      lensCharacter: DEFAULT_LENS_CHARACTER,
      negativePromptBase: `${ABSOLUTE_NEGATIVE_PROMPT}, plastic-looking food, static food display`,
    };
  }

  return {
    contentType,
    productVisual: identities.phoneIdentity,
    environmentVisual: identities.factoryIdentity,
    workerVisual: identities.characterIdentity,
    machineVisual: "physically realistic objects and machinery",
    characterVisual: identities.characterIdentity,
    phoneIdentity: identities.phoneIdentity,
    factoryIdentity: identities.factoryIdentity,
    characterIdentity: identities.characterIdentity,
    productReference: identities.productReference,
    captureMedium,
    lensCharacter: DEFAULT_LENS_CHARACTER,
    negativePromptBase: ABSOLUTE_NEGATIVE_PROMPT,
  };
}

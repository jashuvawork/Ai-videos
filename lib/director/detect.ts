import type { ContentType } from "./types";

const MANUFACTURING_RE =
  /\b(factory|manufactur|assembly line|production line|smartphone|mobile phone|cell phone|phone making|pcb|circuit board|industrial plant|automated factory|how .+ (is|are) made)\b/i;

const FOOD_RE =
  /\b(chocolate|coffee|bread|food|recipe|cocoa|baking|brewing|cheese|wine|beer|pasta|pizza|cookie|cake|harvest|farm to table)\b/i;

const TRAVEL_RE =
  /\b(travel|tour|city|landmark|vacation|journey through|explore|destination|beach|mountain|island)\b/i;

const MOTIVATIONAL_RE =
  /\b(motivat|inspir|success|mindset|never give up|believe in yourself|overcome|champion)\b/i;

const DOCUMENTARY_RE =
  /\b(documentary|history of|how it works|science of|explained|behind the scenes|deep dive)\b/i;

export function detectContentType(idea: string): ContentType {
  const text = idea.trim();
  // Food before manufacturing — "how chocolate is made" matches both patterns
  if (FOOD_RE.test(text)) return "food_process";
  if (MANUFACTURING_RE.test(text)) return "manufacturing";
  if (TRAVEL_RE.test(text)) return "travel";
  if (MOTIVATIONAL_RE.test(text)) return "motivational";
  if (DOCUMENTARY_RE.test(text)) return "documentary";
  return "narrative";
}

export function isVerticalPlatform(platform: string): boolean {
  return /INSTAGRAM|TikTok|SHORTS|REEL|9.?16|vertical/i.test(platform);
}

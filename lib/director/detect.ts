import type { ContentType } from "./types";

const MANUFACTURING_RE =
  /\b(factory|manufactur|assembly line|production line|smartphone|mobile phone|cell phone|phone making|pcb|circuit board|industrial plant|automated factory|how .+ (is|are) made|how it's made|how its made)\b/i;

const FOOD_RE =
  /\b(chocolate|coffee|bread|food|recipe|cocoa|baking|brewing|cheese|wine|beer|pasta|pizza|cookies?|cakes?|biscuits?|crackers?|harvest|farm to table)\b/i;

const TRAVEL_RE =
  /\b(travel|tour|city|landmark|vacation|journey through|explore|destination|beach|mountain|island)\b/i;

const MOTIVATIONAL_RE =
  /\b(motivat|inspir|success|mindset|never give up|believe in yourself|overcome|champion)\b/i;

const DOCUMENTARY_RE =
  /\b(documentary|history of|how it works|science of|explained|behind the scenes|deep dive)\b/i;

const PROCESS_VIDEO_TYPES = new Set([
  "MANUFACTURING",
  "PRODUCT",
  "EDUCATIONAL",
  "DOCUMENTARY",
]);

export function detectContentType(idea: string): ContentType {
  const text = idea.trim();
  if (FOOD_RE.test(text)) return "food_process";
  if (MANUFACTURING_RE.test(text)) return "manufacturing";
  if (TRAVEL_RE.test(text)) return "travel";
  if (MOTIVATIONAL_RE.test(text)) return "motivational";
  if (DOCUMENTARY_RE.test(text)) return "documentary";
  return "narrative";
}

export function resolveContentType(idea: string, videoType?: string): ContentType {
  const fromIdea = detectContentType(idea);
  if (videoType === "MANUFACTURING") {
    return FOOD_RE.test(idea) ? "food_process" : "manufacturing";
  }
  if (videoType && PROCESS_VIDEO_TYPES.has(videoType)) {
    if (fromIdea === "food_process" || fromIdea === "manufacturing") return fromIdea;
    if (MANUFACTURING_RE.test(idea) || FOOD_RE.test(idea)) return fromIdea;
    return "food_process";
  }
  return fromIdea;
}

export function isProcessVideo(contentType: ContentType, videoType?: string): boolean {
  if (contentType === "manufacturing" || contentType === "food_process") return true;
  if (videoType === "MANUFACTURING") return true;
  return false;
}

export function isVerticalPlatform(platform: string): boolean {
  return /INSTAGRAM|TikTok|SHORTS|REEL|9.?16|vertical/i.test(platform);
}

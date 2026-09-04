import { env } from "@/config/env";
import { isRunwayConfigured } from "@/providers/runway/client";
import type { StoryScene } from "@/lib/story-studio/schemas";

export type VideoProviderChoice = "runway" | "veo" | "kling" | "studio" | "auto";

export interface VideoRouteDecision {
  provider: VideoProviderChoice;
  reason: string;
  available: boolean;
}

function isVeoConfigured(): boolean {
  return Boolean(env.GOOGLE_API_KEY);
}

function isKlingConfigured(): boolean {
  return Boolean(env.KLING_API_KEY);
}

export function listAvailableVideoProviders(): VideoProviderChoice[] {
  const available: VideoProviderChoice[] = ["studio"];
  if (isRunwayConfigured()) available.push("runway");
  if (isVeoConfigured()) available.push("veo");
  if (isKlingConfigured()) available.push("kling");
  return available;
}

export function routeVideoProvider(
  scene: StoryScene,
  preference: VideoProviderChoice = "auto",
): VideoRouteDecision {
  const available = listAvailableVideoProviders();

  if (preference !== "auto" && preference !== "studio") {
    const configured =
      (preference === "runway" && isRunwayConfigured()) ||
      (preference === "veo" && isVeoConfigured()) ||
      (preference === "kling" && isKlingConfigured());
    return {
      provider: preference,
      reason: `User override: ${preference}`,
      available: configured,
    };
  }

  const hasAction = scene.gameplaySearchTerms.some((t) =>
    ["chase", "crash", "fight", "run", "drive"].some((k) => t.toLowerCase().includes(k)),
  );

  if (hasAction && isRunwayConfigured()) {
    return { provider: "runway", reason: "Action scene — Runway motion", available: true };
  }
  if (scene.duration <= 6 && isVeoConfigured()) {
    return { provider: "veo", reason: "Short insert — Veo", available: true };
  }
  if (isKlingConfigured() && scene.aiVideoRequired) {
    return { provider: "kling", reason: "Cinematic insert — Kling", available: true };
  }
  if (isRunwayConfigured()) {
    return { provider: "runway", reason: "Default cinematic — Runway", available: true };
  }

  return {
    provider: "studio",
    reason: `Built-in motion engine (${available.join(", ") || "studio only"})`,
    available: true,
  };
}

export function getProviderEnvOverride(provider: VideoProviderChoice): string | undefined {
  switch (provider) {
    case "runway":
      return "runway";
    case "veo":
      return "studio";
    case "kling":
      return "studio";
    default:
      return undefined;
  }
}

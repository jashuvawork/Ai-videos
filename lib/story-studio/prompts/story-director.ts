import type { CreateStoryProjectInput } from "@/lib/story-studio/schemas";

export const STORY_DIRECTOR_SYSTEM_PROMPT = `You are an expert cinematic YouTube story director specializing in gameplay-driven narrative films.

Your job: convert a story idea into a complete production plan as strict JSON.

RULES:
- Strong hook in first 5 seconds — no generic intros
- Every scene must advance the story with visible action
- Vary locations, camera angles, and pacing
- Mark scenes that need user gameplay footage vs AI-generated cinematic inserts
- gameplaySearchTerms: concrete tags for matching GTA/gameplay clips (location, action, time, weather)
- aiVideoRequired: true only for close-ups, dialogue reactions, or shots gameplay cannot cover
- Never put readable text on screen in visual descriptions
- caption fields are not used — narration is voice-over only
- Dialogue must feel natural, not robotic
- Avoid repetitive driving scenes unless story demands it

RETENTION STRUCTURE:
0-5%: hook
5-15%: mystery/setup
15-40%: escalation
40-70%: complications
70-85%: major reveal/confrontation
85-100%: resolution/twist

Return ONLY valid JSON matching the StoryPlan schema.`;

export function buildStoryDirectorUserPrompt(input: CreateStoryProjectInput): string {
  const durationSec = input.durationMinutes * 60;
  const sceneCount = Math.min(40, Math.max(12, Math.round(durationSec / 25)));

  return `
Create a ${input.durationMinutes}-minute (${durationSec}s) ${input.genre} YouTube cinematic story.

Story idea: ${input.idea}
Visual style: ${input.visualStyle}
Narration style: ${input.narrationStyle}
Pacing: ${input.pacing}
Language: ${input.language}
Target audience: ${input.targetAudience}
Gameplay source: ${input.gameplaySource}
Music style: ${input.musicStyle}

Produce approximately ${sceneCount} scenes with durations summing to ${durationSec} seconds.
Each scene needs: sceneId, startTime, duration, purpose, narration, dialogue[], emotion, location, timeOfDay, weather, visualDescription, camera, gameplaySearchTerms[], aiVideoRequired, aiVideoPrompt (if needed), musicMood, soundEffects[], transition.

Include 2-4 characters with voice assignments.
Include storyBeats for retention structure.
Include visualBible with colorFeel, cameraLanguage, lighting, cinematicStyle.

JSON only.`;
}

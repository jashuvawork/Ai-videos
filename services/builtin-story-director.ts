import type { CreateStoryProjectInput, StoryPlan } from "@/lib/story-studio/schemas";

/**
 * Built-in Story Director — works without OpenAI. Produces structured production plans
 * for cinematic gameplay + AI insert stories.
 */
export class BuiltinStoryDirector {
  generate(input: CreateStoryProjectInput): StoryPlan {
    const totalSec = input.durationMinutes * 60;
    const sceneCount = Math.min(24, Math.max(10, Math.round(totalSec / 30)));
    const sceneDuration = totalSec / sceneCount;

    const isTaxiCrime =
      /taxi|billionaire|police|hunted|passenger|chase|crime|gta/i.test(input.idea) ||
      /crime|thriller|gta/i.test(input.genre);

    if (isTaxiCrime) {
      return this.taxiCrimeTemplate(input, totalSec, sceneCount, sceneDuration);
    }

    return this.genericTemplate(input, totalSec, sceneCount, sceneDuration);
  }

  private taxiCrimeTemplate(
    input: CreateStoryProjectInput,
    totalSec: number,
    sceneCount: number,
    sceneDuration: number,
  ): StoryPlan {
    const beats = [
      { id: "hook", label: "Hook", startPercent: 0, endPercent: 8, summary: "Taxi picks up wrong passenger" },
      { id: "setup", label: "Setup", startPercent: 8, endPercent: 25, summary: "Passenger tension builds" },
      { id: "escalation", label: "Escalation", startPercent: 25, endPercent: 55, summary: "Police close in" },
      { id: "confrontation", label: "Confrontation", startPercent: 55, endPercent: 85, summary: "Chase and reveal" },
      { id: "resolution", label: "Resolution", startPercent: 85, endPercent: 100, summary: "Aftermath and twist" },
    ];

    const sceneTemplates = [
      {
        purpose: "Hook — rain-soaked night, taxi cruising",
        location: "Los Santos downtown",
        timeOfDay: "night",
        weather: "rain",
        visual: "Third-person gameplay: yellow taxi drives through neon-lit wet streets, windshield wipers active, radio glow",
        gameplay: ["taxi", "driving", "city", "night", "rain", "downtown"],
        ai: false,
        narration: "Marcus had one rule — never ask questions.",
        emotion: "tension",
        camera: "third_person_tracking",
        sfx: ["rain", "car_engine"],
        music: "mystery",
      },
      {
        purpose: "Passenger enters — mysterious billionaire",
        location: "Taxi curb pickup",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay: taxi stops, rear door opens, suited man slides in fast, glances over shoulder",
        gameplay: ["taxi", "pickup", "passenger", "night", "rain"],
        ai: true,
        aiPrompt: "Cinematic close-up inside taxi: wealthy man in suit enters back seat, rain on window, anxious eyes, no readable text",
        narration: "But tonight, the man who got in changed everything.",
        emotion: "mystery",
        camera: "close_up_interior",
        sfx: ["car_door"],
        music: "suspense",
      },
      {
        purpose: "Police scanner — stakes revealed",
        location: "Taxi interior",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay driving while police scanner chatter; passenger grips briefcase",
        gameplay: ["driving", "taxi", "night", "highway"],
        ai: true,
        aiPrompt: "Close-up: police radio crackles, driver's eyes in rearview mirror, passenger's tense hands on briefcase",
        narration: "The scanner said billionaire Victor Hale — wanted nationwide.",
        emotion: "fear",
        camera: "rearview_mirror_shot",
        sfx: ["police_radio"],
        music: "suspense",
      },
      {
        purpose: "First police sighting",
        location: "City intersection",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay: police cruisers pass opposite direction, taxi accelerates through yellow light",
        gameplay: ["driving", "police", "chase", "city", "night", "intersection"],
        ai: false,
        narration: "Marcus didn't run. Not yet.",
        emotion: "rising tension",
        camera: "third_person_chase",
        sfx: ["sirens_distant"],
        music: "action",
      },
      {
        purpose: "Alley shortcut",
        location: "Industrial alley",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay: taxi barrels into narrow alley, sparks from scraping wall, headlights cutting fog",
        gameplay: ["driving", "alley", "night", "escape", "taxi"],
        ai: false,
        narration: "He knew every shortcut in this city.",
        emotion: "urgency",
        camera: "low_tracking",
        sfx: ["tires_screech"],
        music: "action",
      },
      {
        purpose: "Passenger confession",
        location: "Parked under overpass",
        timeOfDay: "night",
        weather: "rain",
        visual: "AI insert: two-shot inside stopped taxi, passenger explains, driver listens, rain on glass",
        gameplay: ["taxi", "parked", "night"],
        ai: true,
        aiPrompt: "Cinematic interior taxi under bridge: passenger leans forward speaking urgently, driver profile lit by dashboard, rain streaks on windows",
        narration: "Hale said the police weren't after him for the money.",
        emotion: "revelation",
        camera: "two_shot_interior",
        sfx: ["rain_heavy"],
        music: "emotional",
      },
      {
        purpose: "Helicopter searchlight",
        location: "Open highway",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay: searchlight sweeps highway, taxi weaves between traffic at high speed",
        gameplay: ["highway", "chase", "helicopter", "night", "driving"],
        ai: false,
        narration: "They had air support now.",
        emotion: "panic",
        camera: "aerial_third_person",
        sfx: ["helicopter", "sirens"],
        music: "action",
      },
      {
        purpose: "Roadblock evasion",
        location: "Highway off-ramp",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay: taxi drifts off-ramp last second avoiding roadblock, police cars collide behind",
        gameplay: ["chase", "drift", "highway", "police", "night"],
        ai: false,
        narration: "One wrong turn and it was over.",
        emotion: "adrenaline",
        camera: "chase_cam",
        sfx: ["crash", "sirens"],
        music: "action",
      },
      {
        purpose: "Safe house arrival",
        location: "Warehouse district",
        timeOfDay: "night",
        weather: "rain",
        visual: "Gameplay: taxi enters abandoned warehouse lot, gates close behind",
        gameplay: ["warehouse", "driving", "night", "arrival"],
        ai: true,
        aiPrompt: "Wide shot: taxi enters rain-soaked industrial yard, warehouse doors opening, cinematic moody lighting",
        narration: "Hale had a safe house. Of course he did.",
        emotion: "brief relief",
        camera: "wide_establishing",
        sfx: ["metal_gate"],
        music: "mystery",
      },
      {
        purpose: "Twist — passenger is not who he seems",
        location: "Warehouse interior",
        timeOfDay: "night",
        weather: "none",
        visual: "AI insert: passenger removes disguise element, reveals different identity, driver shocked",
        gameplay: [],
        ai: true,
        aiPrompt: "Dramatic cinematic close-up: man removes glasses and wig revealing different face, warehouse backlight, driver reaction in foreground blur",
        narration: "The billionaire wasn't Victor Hale. He was the man who'd been hunting him.",
        emotion: "shock",
        camera: "dramatic_close_up",
        sfx: ["dramatic_sting"],
        music: "reveal",
      },
      {
        purpose: "Final drive — dawn",
        location: "Coastal road",
        timeOfDay: "dawn",
        weather: "clearing",
        visual: "Gameplay: taxi drives along coastal highway at sunrise, city behind, calm pace",
        gameplay: ["driving", "coast", "sunrise", "taxi", "calm"],
        ai: false,
        narration: "Marcus drove until the sun came up. He never spoke of that night.",
        emotion: "resolution",
        camera: "slow_tracking",
        sfx: ["waves"],
        music: "ending",
      },
      {
        purpose: "Outro — taxi returns to city",
        location: "City morning",
        timeOfDay: "morning",
        weather: "clear",
        visual: "Gameplay: taxi merges into morning traffic, ordinary day resumes",
        gameplay: ["driving", "city", "morning", "taxi"],
        ai: false,
        narration: "Some fares you never forget.",
        emotion: "contemplative",
        camera: "third_person",
        sfx: ["traffic_ambient"],
        music: "ending",
      },
    ];

    const selected = sceneTemplates.slice(0, sceneCount);
    let cursor = 0;
    const scenes = selected.map((t, i) => {
      const duration = i === selected.length - 1 ? totalSec - cursor : sceneDuration;
      const scene = {
        sceneId: `scene_${String(i + 1).padStart(2, "0")}`,
        startTime: cursor,
        duration: Math.round(duration * 10) / 10,
        purpose: t.purpose,
        narration: t.narration,
        dialogue: [] as { character: string; text: string; emotion?: string }[],
        emotion: t.emotion,
        location: t.location,
        timeOfDay: t.timeOfDay,
        weather: t.weather,
        visualDescription: t.visual,
        camera: t.camera,
        gameplaySearchTerms: t.gameplay,
        aiVideoRequired: t.ai,
        aiVideoPrompt: t.ai ? t.aiPrompt : undefined,
        imageRequired: false,
        musicMood: t.music,
        soundEffects: t.sfx,
        transition: i === selected.length - 1 ? "fade" : "cut",
        voiceDirection: {
          emotion: t.emotion,
          pace: input.pacing === "fast" ? "fast" : "medium",
          intensity: 0.6,
        },
      };
      cursor += scene.duration;
      return scene;
    });

    return {
      title: this.inferTitle(input.idea),
      logline: input.idea,
      genre: input.genre,
      tone: input.pacing === "fast" ? "fast-paced crime thriller" : "slow-burn crime thriller",
      targetDurationSeconds: totalSec,
      visualStyle: input.visualStyle,
      characters: [
        {
          id: "char_driver",
          name: "Marcus",
          description: "Veteran taxi driver, cautious, street-smart",
          ageRange: "40s",
          personality: "guarded, observant",
          role: "protagonist",
          clothing: "worn jacket, taxi company cap",
          appearance: "weathered face, tired eyes",
          voice: input.voice.toLowerCase(),
          accent: "neutral American",
        },
        {
          id: "char_passenger",
          name: "Victor Hale",
          description: "Alleged billionaire fugitive — identity twist in final act",
          ageRange: "50s",
          personality: "composed, secretive",
          role: "mystery passenger",
          clothing: "expensive dark suit, no logos",
          appearance: "sharp features, anxious micro-expressions",
          voice: "male",
          accent: "refined",
        },
      ],
      locations: [...new Set(selected.map((s) => s.location))],
      storyBeats: beats,
      scenes,
      visualBible: {
        colorFeel: "neon noir — wet asphalt blues, amber streetlights, high contrast",
        cameraLanguage: "GTA third-person for action, cinematic AI inserts for close-ups",
        lighting: "night rain practicals, dawn golden hour finale",
        cinematicStyle: input.visualStyle,
      },
    };
  }

  private genericTemplate(
    input: CreateStoryProjectInput,
    totalSec: number,
    sceneCount: number,
    sceneDuration: number,
  ): StoryPlan {
    let cursor = 0;
    const scenes = Array.from({ length: sceneCount }, (_, i) => {
      const isLast = i === sceneCount - 1;
      const duration = isLast ? totalSec - cursor : sceneDuration;
      const pct = (i / sceneCount) * 100;
      const phase =
        pct < 8 ? "hook" : pct < 25 ? "setup" : pct < 55 ? "escalation" : pct < 85 ? "climax" : "resolution";

      const scene = {
        sceneId: `scene_${String(i + 1).padStart(2, "0")}`,
        startTime: cursor,
        duration: Math.round(duration * 10) / 10,
        purpose: `${phase} — scene ${i + 1}`,
        narration: `Scene ${i + 1}: the story continues.`,
        dialogue: [],
        emotion: phase === "hook" ? "intrigue" : "tension",
        location: "City environment",
        timeOfDay: i < sceneCount / 2 ? "night" : "dawn",
        weather: "clear",
        visualDescription: `Gameplay footage: ${input.visualStyle} style action matching story beat — ${input.idea.slice(0, 80)}`,
        camera: "third_person_tracking",
        gameplaySearchTerms: ["driving", "city", "action", input.genre.toLowerCase()],
        aiVideoRequired: i % 4 === 1,
        aiVideoPrompt:
          i % 4 === 1
            ? `Cinematic close-up insert for ${input.genre}: emotional character moment, ${input.visualStyle}, no text`
            : undefined,
        imageRequired: false,
        musicMood: phase === "climax" ? "action" : "suspense",
        soundEffects: ["ambient"],
        transition: isLast ? "fade" : "cut",
      };
      cursor += scene.duration;
      return scene;
    });

    return {
      title: this.inferTitle(input.idea),
      logline: input.idea,
      genre: input.genre,
      tone: input.genre,
      targetDurationSeconds: totalSec,
      visualStyle: input.visualStyle,
      characters: [
        {
          id: "char_protagonist",
          name: "Protagonist",
          description: "Main character",
          role: "protagonist",
          voice: input.voice.toLowerCase(),
        },
      ],
      locations: ["City environment"],
      storyBeats: [
        { id: "hook", label: "Hook", startPercent: 0, endPercent: 8, summary: "Opening hook" },
        { id: "resolution", label: "End", startPercent: 85, endPercent: 100, summary: "Resolution" },
      ],
      scenes,
      visualBible: {
        cinematicStyle: input.visualStyle,
        cameraLanguage: "gameplay third-person with AI cinematic inserts",
      },
    };
  }

  private inferTitle(idea: string): string {
    const trimmed = idea.split(/[.!?]/)[0].trim();
    if (trimmed.length <= 60) return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    return trimmed.slice(0, 57) + "...";
  }
}

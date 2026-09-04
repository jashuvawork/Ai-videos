# AI Story Studio

Cinematic YouTube story production platform — gameplay footage + AI cinematic inserts + ElevenLabs voice + FFmpeg assembly.

## Phase 1 (implemented)

- Story Studio dashboard at `/studio`
- Create Story page with Story Director
- Structured `StoryPlan` JSON (Zod validated)
- Built-in Story Director (no OpenAI required)
- ElevenLabs auto-selected when `ELEVENLABS_API_KEY` is set
- Prisma models: `StoryStudioStatus`, `GameplayClip`, project story fields
- API routes under `/api/studio/*`

## Configure ElevenLabs

On Railway or local `.env` (never commit keys):

```bash
ELEVENLABS_API_KEY=your_key_here
AI_VOICE_PROVIDER=elevenlabs  # optional — auto-upgrades when key is set
```

## Remaining phases

| Phase | Feature |
|-------|---------|
| 2 | Storyboard UI polish, character persistence |
| 3 | Scene editor with regenerate |
| 4 | Gameplay upload + analysis + matching |
| 5 | Video provider router (Runway/Veo/Kling) |
| 6 | Voice generation per scene |
| 7 | Timeline engine |
| 8 | FFmpeg worker render |
| 9–15 | Music, SFX, QC, thumbnails, Shorts, YouTube |

## Architecture

- **Software**: this Next.js app + worker
- **Generation**: provider adapters (`providers/*`)
- **Assembly**: FFmpeg (`services/video-render.ts`)

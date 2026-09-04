# AI Story Studio

Cinematic YouTube story production — gameplay footage + AI cinematic inserts + ElevenLabs voice + FFmpeg assembly.

## Full pipeline (implemented)

| Step | Route / Service |
|------|-----------------|
| Create story | `/studio/create` → `StoryDirectorService` |
| Storyboard | `/studio/projects/[id]` |
| Gameplay upload | `/studio/gameplay` → `POST /api/studio/gameplay` |
| Gameplay matching | `POST /api/studio/projects/[id]/match-gameplay` |
| Full render | `POST /api/studio/projects/[id]/generate` → `StudioPipelineProcessor` |
| Preview | Video player on project page |
| QC + Shorts | `StudioQCService`, `shorts-engine` |
| YouTube metadata | Auto-generated on render completion |
| Debug jobs | `/studio/admin` |

## MVP flow

1. **Create Story** at `/studio/create` (taxi driver example works without API keys)
2. **Generate Story** → storyboard with ~12 scenes
3. **Upload gameplay** at `/studio/gameplay` (optional — improves matching)
4. **Match Gameplay** → tags clips to scenes
5. **Render Full Video** → voice (ElevenLabs/Edge) + AI visuals + FFmpeg
6. **Preview** final MP4 with QC score

## Configure providers

```bash
ELEVENLABS_API_KEY=your_key_here   # server only — never commit
RUNWAY_API_KEY=                    # optional AI video
GOOGLE_API_KEY=                    # optional Veo routing
KLING_API_KEY=                     # optional Kling routing
OPENAI_API_KEY=                    # optional LLM story director
```

## Architecture

- **Story plan** → `hydrateStoryPlan()` → Prisma `Scene` + `Character` rows
- **Gameplay** → ffprobe + tag inference → `GameplayClip` → matcher scores
- **Pipeline** → `StudioPipelineProcessor` (reuses legacy voice/timeline/render services)
- **Worker** → `VideoGenerationProcessor` branches on `projectKind: STORY_STUDIO`

## API routes

- `GET/POST /api/studio/projects`
- `POST /api/studio/projects/[id]/generate-story`
- `POST /api/studio/projects/[id]/generate` — full render
- `POST /api/studio/projects/[id]/match-gameplay`
- `GET /api/studio/projects/[id]/costs`
- `GET/POST /api/studio/gameplay`
- `GET /api/studio/admin/jobs`

## Deferred

- YouTube OAuth publish (metadata generated; upload requires OAuth)
- BullMQ/Redis (Postgres poll worker used in production)
- Vector embeddings for gameplay (tag-based matching for MVP)
- Per-scene manual editor (legacy scene editor can be wired later)

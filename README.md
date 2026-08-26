# AI Video Studio

**Turn ideas into stories.**

AI Video Studio is a production-ready web application that transforms any idea — a story, sentence, product description, or concept — into a polished AI-generated video suitable for Instagram Reels, YouTube Shorts, TikTok, and more.

## What It Does

```
INPUT → AI UNDERSTANDS → SCRIPT → SCENES → VISUALS → VOICE → MUSIC → CAPTIONS → EDIT → FINAL MP4
```

Give the app an idea like:

> A young pilot crashes on a mysterious island and discovers a strange abandoned aircraft.

The system automatically:

1. Understands the idea and determines video type
2. Writes a compelling script with hook and pacing
3. Creates characters with visual consistency
4. Breaks the story into timed scenes
5. Generates visual prompts and assets (images/video)
6. Generates narration, music, and sound effects
7. Creates subtitles and synchronizes audio
8. Renders a final MP4 with FFmpeg
9. Generates thumbnail and social metadata

## Architecture

```
/app              Next.js pages and API routes
/components       React UI components
/lib              Utils, schemas, prompts, database
/services         Business logic (story, render, timeline, etc.)
/providers        AI provider interfaces + mock adapters
/jobs             Background job definitions
/workers          Job processor initialization
/storage          Local/S3 storage abstraction
/config           Environment and video settings
/prisma           Database schema
/tests            Unit and E2E tests
```

### Provider Abstraction

Providers are swappable via environment variables:

| Variable | Options |
|----------|---------|
| `AI_TEXT_PROVIDER` | `mock`, `openai` |
| `AI_IMAGE_PROVIDER` | `mock` (+ future: stability, dalle) |
| `AI_VIDEO_PROVIDER` | `mock` (+ future: runway, pika) |
| `AI_VOICE_PROVIDER` | `mock` (+ future: elevenlabs) |
| `AI_MUSIC_PROVIDER` | `mock` |

### Job Pipeline

Asynchronous generation via in-memory queue (Redis/BullMQ ready):

`CREATE_SCRIPT → CREATE_CHARACTER_BIBLE → CREATE_SCENES → GENERATE_VISUALS → GENERATE_VOICE → GENERATE_MUSIC → GENERATE_SFX → GENERATE_SUBTITLES → BUILD_TIMELINE → RENDER_VIDEO → GENERATE_THUMBNAIL → GENERATE_METADATA → COMPLETE`

## Installation

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- FFmpeg 6+

### Setup

```bash
# Clone and install
npm install

# Configure environment
cp .env.example .env
# Edit DATABASE_URL and optional API keys

# Database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for the full list. Key variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/aivideo
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads

# AI Providers (mock when unset)
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
AI_VIDEO_PROVIDER=mock
AI_VOICE_PROVIDER=mock
AI_MUSIC_PROVIDER=mock

# API Keys (server-side only, never expose to browser)
OPENAI_API_KEY=
LLM_API_KEY=
IMAGE_API_KEY=
VIDEO_API_KEY=
VOICE_API_KEY=
MUSIC_API_KEY=

# Optional Redis for production queue
REDIS_URL=
```

## Database Setup

```bash
# Create PostgreSQL database
createdb aivideo

# Push schema
npm run db:push

# Open Prisma Studio
npm run db:studio
```

## FFmpeg Installation

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Verify
ffmpeg -version
```

## Development Mode

When API keys are missing, mock providers generate test assets so the full pipeline works end-to-end:

- **Mock LLM**: Generates structured story JSON from your idea
- **Mock Image**: Creates colored placeholder images via FFmpeg
- **Mock Video**: Creates colored placeholder video clips
- **Mock Voice**: Generates tone audio with correct duration
- **Mock Music**: Generates ambient background audio

Mock assets are clearly labeled in generated content.

## Provider Configuration

### OpenAI (LLM)

```env
AI_TEXT_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### Adding New Providers

1. Create adapter in `providers/<type>/`
2. Implement the provider interface
3. Register in `providers/index.ts`
4. Set environment variable

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/projects` | Create project |
| `GET` | `/api/projects` | List projects |
| `GET` | `/api/projects/:id` | Get project details |
| `POST` | `/api/projects/:id/generate` | Start video generation |
| `POST` | `/api/projects/:id/scenes/:sceneId/regenerate` | Regenerate single scene |
| `GET` | `/api/projects/:id/download` | Download MP4 |
| `GET` | `/api/jobs/:id` | Get job progress |
| `GET` | `/api/files/:path` | Serve stored assets |

## Testing

```bash
# Unit tests
npm test

# E2E pipeline test (requires DB + FFmpeg)
npx tsx tests/e2e-pipeline.test.ts
```

## Production Deployment

### Recommended Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Vercel /   │     │  PostgreSQL  │     │  S3 / R2    │
│  Next.js    │────▶│  (managed)   │     │  Storage    │
│  (API + UI) │     └──────────────┘     └─────────────┘
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌──────────────┐
│  Worker     │────▶│  Redis       │
│  (Docker)   │     │  (BullMQ)    │
│  FFmpeg     │     └──────────────┘
└─────────────┘
```

**Important**: Video rendering is long-running. Do not run FFmpeg in serverless functions. Use a dedicated worker process:

```bash
# Worker process (separate from Next.js)
npm run worker
```

### Storage

For production, configure S3-compatible storage:

```env
STORAGE_PROVIDER=s3
STORAGE_URL=https://your-bucket.s3.amazonaws.com
STORAGE_BUCKET=ai-video-studio
```

## Export Presets

| Preset | Resolution | Aspect Ratio |
|--------|-----------|--------------|
| Instagram Reel | 1080 × 1920 | 9:16 |
| YouTube Short | 1080 × 1920 | 9:16 |
| YouTube | 1920 × 1080 | 16:9 |
| Square Social | 1080 × 1080 | 1:1 |

## Troubleshooting

### FFmpeg not found
Ensure FFmpeg is installed and in PATH: `which ffmpeg`

### Database connection failed
Check `DATABASE_URL` and that PostgreSQL is running: `pg_isready`

### Generation stuck
Check server logs for job errors. Jobs run in-process via in-memory queue during development.

### Mock mode
If you see "MOCK AI IMAGE" in videos, mock providers are active. Add API keys to use real AI.

## License

MIT

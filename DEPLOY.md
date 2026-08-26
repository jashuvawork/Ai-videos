# Railway deployment guide

## Architecture (production)

| Service | Platform | Role |
|---------|----------|------|
| **ai-video-backend** | Railway | Next.js API + UI + FFmpeg poll worker (single container) |
| **Postgres (`aivideo` DB)** | Railway | Database (separate from Jgroup) |
| **Jgroup** | Railway | Unrelated app — **do not modify** |

**Live app:** https://ai-video-backend-production-96e9.up.railway.app

The combined `Dockerfile.railway` runs:

- `npm start` — Next.js on port 8080
- `npm run worker:poll` — background job processor (FFmpeg rendering)

Both processes share `/app/uploads` on the same container filesystem, so `/api/files/...` and video playback work.

**Vercel is not recommended** for this app: serverless functions lack persistent storage and FFmpeg. Use Railway only.

## 1. Railway — PostgreSQL

1. Railway project → provision **Postgres** (or use existing)
2. Create a dedicated database for AI Video Studio (separate from other apps):

```sql
CREATE DATABASE aivideo;
```

3. Copy `DATABASE_URL` pointing to the `aivideo` database.

## 2. Railway — ai-video-backend

1. **New** → **GitHub Repo** → `jashuvawork/Ai-videos`
2. Service name: `ai-video-backend`
3. Uses `railway.backend.toml` → `Dockerfile.railway`
4. Environment variables:

```env
DATABASE_URL=postgresql://...@postgres.railway.internal:5432/aivideo
DISABLE_INLINE_WORKER=true
APP_URL=https://your-backend.up.railway.app
STORAGE_LOCAL_PATH=/app/uploads
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
AI_VIDEO_PROVIDER=mock
AI_VOICE_PROVIDER=mock
AI_MUSIC_PROVIDER=mock
NODE_ENV=production
```

5. Deploy. Health check: `/api/health`

## 3. Disable separate worker (if present)

If you previously deployed `ai-video-worker`, scale it to zero so jobs run only on the combined backend:

```bash
export RAILWAY_API_TOKEN=your_account_token
railway link
railway scale us-west=0 sfo=0 --service ai-video-worker
```

## CLI deploy

```bash
export RAILWAY_API_TOKEN=your_account_token
railway link --service ai-video-backend
git push origin cursor/ai-video-studio-dd06
railway up --detach
```

Or redeploy the latest commit:

```bash
railway redeploy --service ai-video-backend
```

## Verify deployment

1. Open the Railway URL → create a project → generate video
2. Job should reach `COMPLETED` (worker logs: `[WORKER] AI Video Studio poll worker started`)
3. Video plays in the UI; `/api/files/projects/.../final.mp4` returns 200
4. Download works via `/api/projects/:id/download`

## Notes

- Use a Railway **account token** (`RAILWAY_API_TOKEN`), not a project token, for CLI access.
- Uploads are stored on the container disk. For persistence across redeploys, attach a Railway volume at `/app/uploads`.
- Generate a new Railway account token at: Railway Dashboard → Account Settings → Tokens

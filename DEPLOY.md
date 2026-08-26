# Railway deployment guide

## Architecture

| Service | Platform | Role |
|---------|----------|------|
| **Web app** | Vercel | Next.js UI + API (job enqueue) |
| **PostgreSQL** | Railway | Database |
| **Worker** | Railway | FFmpeg video rendering (`worker:poll`) |

## 1. Railway — PostgreSQL

1. Go to [railway.app](https://railway.app) → New Project → **Provision PostgreSQL**
2. Open the Postgres service → **Variables** → copy `DATABASE_URL`
3. (Optional) Run migrations: `DATABASE_URL=... npx prisma db push`

## 2. Railway — Worker (FFmpeg)

1. In the same project: **New** → **GitHub Repo** → select `jashuvawork/Ai-videos`
2. Set **Root Directory** to `/` and use `Dockerfile.worker` (configured in `railway.toml`)
3. Add environment variables (same as web, especially `DATABASE_URL`):
   - `DATABASE_URL` — from Postgres service
   - `DISABLE_INLINE_WORKER=true`
   - `AI_TEXT_PROVIDER=mock` (or `openai` + keys)
   - `STORAGE_LOCAL_PATH=/app/uploads`
4. Deploy — the worker polls for `PENDING` jobs every 3 seconds

## 3. Vercel — Web app

1. Import repo at [vercel.com](https://vercel.com) or use CLI: `npx vercel --prod`
2. Set environment variables:

```env
DATABASE_URL=postgresql://...  # from Railway Postgres
DISABLE_INLINE_WORKER=true
APP_URL=https://your-app.vercel.app
AI_TEXT_PROVIDER=mock
AI_IMAGE_PROVIDER=mock
AI_VIDEO_PROVIDER=mock
AI_VOICE_PROVIDER=mock
AI_MUSIC_PROVIDER=mock
STORAGE_LOCAL_PATH=/tmp/uploads
```

3. Redeploy after setting env vars

## CLI deploy (Railway worker)

```bash
export RAILWAY_TOKEN=your_account_token  # Account token from Railway dashboard
railway link
railway add --database postgres  # if needed
railway up --service worker
```

## CLI deploy (Vercel)

```bash
export VERCEL_TOKEN=your_token
npx vercel --prod
npx vercel env add DATABASE_URL production
```

## Notes

- Video rendering **cannot** run on Vercel serverless (no FFmpeg). The Railway worker handles all renders.
- Vercel `/tmp` storage is ephemeral — generated videos may not persist across invocations. For production, configure S3 storage.
- Generate a new Railway **account token** at: Railway Dashboard → Account Settings → Tokens

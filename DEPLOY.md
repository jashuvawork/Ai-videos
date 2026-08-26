# Railway deployment guide

## Projects (do not mix)

| Railway project | Purpose |
|-----------------|---------|
| **ai-video-studio** | AI Video Studio only (`ai-video-backend` + dedicated Postgres) |
| **brave-contentment** | Jgroup and other apps — **do not add AI Video services here** |

## Architecture (production)

| Service | Platform | Role |
|---------|----------|------|
| **ai-video-backend** | Railway (`ai-video-studio` project) | Next.js API + UI + FFmpeg poll worker |
| **Postgres** | Railway (`ai-video-studio` project) | Dedicated database for AI Video Studio |

**Live app:** https://ai-video-backend-production-4d10.up.railway.app

**Dashboard:** https://railway.com/project/911bf6c6-fac3-412f-b11a-8b817902c0ee

The combined `Dockerfile.railway` runs:

- `npx prisma migrate deploy` — apply DB schema on boot
- `npm start` — Next.js on port 8080
- `npm run worker:poll` — background job processor (FFmpeg rendering)

Both processes share `/app/uploads` on the same container filesystem, so `/api/files/...` and video playback work.

**Vercel is not recommended** for this app: serverless functions lack persistent storage and FFmpeg. Use Railway only.

## 1. Railway — new project setup

```bash
npx @railway/cli@latest init -n ai-video-studio
npx @railway/cli@latest add -d postgres
npx @railway/cli@latest add -s ai-video-backend -r jashuvawork/Ai-videos
npx @railway/cli@latest link -p ai-video-studio -s ai-video-backend
npx @railway/cli@latest domain   # generates public URL
```

Environment variables for `ai-video-backend`:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
DISABLE_INLINE_WORKER=true
APP_URL=https://your-backend.up.railway.app
STORAGE_LOCAL_PATH=/app/uploads
AI_TEXT_PROVIDER=studio
AI_IMAGE_PROVIDER=studio
AI_VIDEO_PROVIDER=studio
AI_VOICE_PROVIDER=edge
AI_MUSIC_PROVIDER=studio
NODE_ENV=production
```

## 2. Remove AI Video from `brave-contentment` (Jgroup project)

Scale AI Video services to zero (Jgroup is untouched):

```bash
npx @railway/cli@latest scale -p brave-contentment -e production -s ai-video-backend sfo=0 us-west=0 us-east=0 eu-west=0 southeast-asia=0
npx @railway/cli@latest scale -p brave-contentment -e production -s ai-video-worker sfo=0 us-west=0 us-east=0 eu-west=0 southeast-asia=0
```

Then delete `ai-video-backend` and `ai-video-worker` services in the Railway dashboard (Settings → Delete Service). **Do not delete Postgres** if Jgroup uses it.

## CLI deploy (ai-video-studio project)

```bash
export RAILWAY_API_TOKEN=your_account_token
npx @railway/cli@latest link -p ai-video-studio -s ai-video-backend
git push origin main
npx @railway/cli@latest up --detach
```

Or redeploy:

```bash
npx @railway/cli@latest redeploy -s ai-video-backend
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

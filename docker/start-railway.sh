#!/bin/sh
set -e
cd /app

echo "[START] Syncing database schema..."
npx prisma db push --skip-generate

chown -R nextjs:nodejs uploads renders 2>/dev/null || true

echo "[START] Starting worker and Next.js..."
su -s /bin/sh nextjs -c "npm run worker:poll & exec npm start"

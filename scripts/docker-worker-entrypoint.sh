#!/bin/sh
set -e
cd /app
echo "[docker-worker] prisma migrate deploy…"
npx prisma migrate deploy
echo "[docker-worker] starting worker…"
exec npm run worker

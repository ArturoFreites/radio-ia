#!/bin/sh
set -e
cd /app

echo "[docker] prisma migrate deploy…"
npx prisma migrate deploy

if [ "${DOCKER_SKIP_SEED:-0}" != "1" ]; then
  echo "[docker] prisma db seed…"
  npx prisma db seed || echo "[docker] seed omitido (ya aplicado o sin cambios)"
fi

echo "[docker] starting Next.js…"
echo "[docker] dashboard: ${NEXTAUTH_URL:-http://localhost:3000}/dashboard"
echo "[docker] cabina:    ${NEXTAUTH_URL:-http://localhost:3000}/cabina?token=<aireToken>"
exec npm run start

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache ffmpeg wget

FROM base AS deps
COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
 && npm config set fetch-timeout 600000 \
 && npm config set fetch-retries 10 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --prefer-offline --no-audit --no-fund
COPY prisma ./prisma
RUN npx prisma generate

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/src ./src
COPY scripts/docker-app-entrypoint.sh ./docker-app-entrypoint.sh
RUN chmod +x ./docker-app-entrypoint.sh && mkdir -p /app/storage/audio
# Las migraciones y el seed se ejecutan al arrancar el contenedor (hay DB en runtime, no en build).
EXPOSE 3000
CMD ["./docker-app-entrypoint.sh"]

# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 SKIP_BOOTSTRAP=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
LABEL org.opencontainers.image.source="https://github.com/haustex/pembukuan-umkm" \
      org.opencontainers.image.description="Pembukuan & laporan keuangan untuk UMKM Indonesia" \
      org.opencontainers.image.licenses="MIT"
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3010 HOSTNAME=0.0.0.0 TZ=Asia/Jakarta
RUN apk add --no-cache tzdata && addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/drizzle ./drizzle
COPY --from=build --chown=app:app /app/scripts ./scripts
USER app
EXPOSE 3010
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3010/api/health || exit 1
CMD ["node", "server.js"]

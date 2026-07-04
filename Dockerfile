FROM node:20-bookworm-slim AS deps

WORKDIR /app

ENV NODE_ENV=development

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

RUN npm ci --workspace apps/api --include-workspace-root

FROM deps AS builder

COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY libs ./libs
COPY infra ./infra

RUN npm run build --workspace apps/api

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV API_PORT=3000

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package-lock.json ./apps/api/

RUN npm ci --omit=dev --workspace apps/api --include-workspace-root \
  && npm cache clean --force

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/infra/migrations ./infra/migrations
COPY --from=builder /app/infra/seed ./infra/seed

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.API_PORT || 3000) + '/api/health').then(r => r.json()).then(j => process.exit(j.status === 'ok' ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/apps/api/src/main.js"]

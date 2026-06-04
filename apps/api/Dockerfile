# ============================================================
# Dockerfile — Probayo NestJS API (npm workspaces monorepo)
# ============================================================
# Multi-stage build for smallest possible image:
#   - builder: installs all deps, generates Prisma client, compiles build
#   - runner: strips devDeps, prunes cross-platform Prisma engines (~50MB)
#   - node:24-alpine base (~50MB) → final image ~200-300MB
#   - Non-root user for runtime security
#   - Prisma migrations on startup (external DB, not embedded)
# ============================================================
# Build from the MONOREPO ROOT:
#   docker build -f apps/api/Dockerfile -t harddy0/probayo:1.0.0 .
# ============================================================

# ─────────────────────────────────────────────────────────────
# Stage 1: Install dependencies & build
# ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# ── Layer 1: System deps for TLS/SSL (TiDB Cloud needs root CAs) ──
RUN apk add --no-cache ca-certificates && update-ca-certificates

WORKDIR /app

# ── Layer 2: Workspace manifests + root lockfile ──
# Copy root workspace config and the single source-of-truth lock file
COPY package.json package-lock.json ./
# Copy the API's package.json so npm can resolve the workspace member
COPY apps/api/package.json ./apps/api/
# Copy Prisma schema (needed before npm ci for postinstall hooks)
COPY apps/api/prisma/ ./apps/api/prisma/

# Install ALL dependencies using the root lockfile for reproducibility
RUN npm ci

# ── Layer 3: API source code ──
COPY apps/api/tsconfig*.json apps/api/nest-cli.json apps/api/prisma.config.ts ./apps/api/
COPY apps/api/src/ ./apps/api/src/

# ── Layer 4: Generate Prisma client & compile NestJS ──
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

# ── Layer 5: Strip devDeps (prune at workspace root, keeps hoisted deps) ──
WORKDIR /app
RUN npm prune --omit=dev && npm cache clean --force

# ─────────────────────────────────────────────────────────────
# Stage 2: Production runtime — absolute minimum
# ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

# ── Layer 1: Runtime system deps ──
# openssl needed by Prisma engine; ca-certificates for TLS to TiDB Cloud
RUN apk add --no-cache openssl ca-certificates && update-ca-certificates

WORKDIR /app/apps/api

# ── Layer 2: Production artifacts ──
# node_modules is hoisted to /app/node_modules by npm workspaces
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/apps/api/prisma.config.ts ./

# ── Layer 3: Strip ~50MB of non-Alpine Prisma engines + cache ──
RUN rm -rf /app/node_modules/.cache && \
    find /app/node_modules/.prisma/client -name "*.so*" -not -name "*alpine*" -delete 2>/dev/null || true && \
    find /app/node_modules/.prisma/client -name "*.node" -not -name "*alpine*" -delete 2>/dev/null || true && \
    rm -f /app/node_modules/.prisma/client/*.wasm 2>/dev/null || true

# ── Layer 4: OCI metadata labels ──
LABEL org.opencontainers.image.title="Probayo API" \
      org.opencontainers.image.description="NestJS backend for the Probayo ticketing system" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.url="https://github.com/harddy0/probayo"

# ── Layer 5: Non-root user + uploads directory ──
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -h /home/appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads /app/apps/api/prisma

ENV NODE_ENV=production HOME=/home/appuser PRISMA_CONFIG=./prisma.config.ts
USER appuser

# Port is documentation only — runtime port is controlled via $PORT env var
EXPOSE 3001

# ── Healthcheck ─────────────────────────────────────────────
# Uses /health/live (no DB/Redis needed) and $PORT env var
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const p=process.env.PORT||3001;require('http').get('http://localhost:'+p+'/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# ── Startup ─────────────────────────────────────────────────
# 1. Run pending database migrations
# 2. Start the NestJS API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]

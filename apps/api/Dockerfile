# ============================================================
# Dockerfile — Probayo NestJS API
# ============================================================
# Multi-stage build for smallest possible image:
#   - builder: installs all deps, generates Prisma client, compiles build
#   - runner: strips devDeps, prunes cross-platform Prisma engines (~50MB)
#   - node:24-alpine base (~50MB) → final image ~200-300MB
#   - Non-root user for runtime security
#   - Prisma migrations on startup (external DB, not embedded)
# ============================================================

# ─────────────────────────────────────────────────────────────
# Stage 1: Install dependencies & build
# ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

# ── Layer 1: System deps for TLS/SSL (TiDB Cloud needs root CAs) ──
RUN apk add --no-cache ca-certificates && update-ca-certificates

# ── Layer 2: Dependency manifests (cached until package.json/prisma changes) ──
COPY package*.json ./
COPY prisma/ ./prisma/

# Install ALL dependencies (dev + prod) — uses lockfile for reproducibility
RUN npm ci

# ── Layer 3: Source code + TLS cert (only what NestJS needs) ──
COPY tsconfig*.json nest-cli.json prisma.config.ts ./
COPY src/ ./src/
COPY isrgrootx1.pem ./

# ── Layer 4: Generate Prisma client & compile NestJS ──
RUN npx prisma generate && npm run build

# ── Layer 5: Strip devDeps (prisma CLI is in dependencies, so it's kept) ──
RUN npm prune --omit=dev && npm cache clean --force

# ─────────────────────────────────────────────────────────────
# Stage 2: Production runtime — absolute minimum
# ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

# ── Layer 1: Runtime system deps ──
# openssl needed by Prisma engine; ca-certificates for TLS to TiDB Cloud
RUN apk add --no-cache openssl ca-certificates && update-ca-certificates

# ── Layer 2: Production artifacts ──
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/isrgrootx1.pem ./

# ── Layer 3: Strip ~50MB of non-Alpine Prisma engines + cache ──
RUN rm -rf node_modules/.cache && \
    find node_modules/.prisma/client -name "*.so*" -not -name "*alpine*" -delete 2>/dev/null || true && \
    find node_modules/.prisma/client -name "*.node" -not -name "*alpine*" -delete 2>/dev/null || true && \
    rm -f node_modules/.prisma/client/*.wasm 2>/dev/null || true

# ── Layer 4: OCI metadata labels ──
LABEL org.opencontainers.image.title="Probayo API" \
      org.opencontainers.image.description="NestJS backend for the Probayo ticketing system" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.url="https://github.com/harddy0/probayo"

# ── Layer 5: Non-root user + uploads directory ──
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -h /home/appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads /app/prisma

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

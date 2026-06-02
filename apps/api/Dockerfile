# ============================================================
# Dockerfile — Probayo NestJS API
# ============================================================
# Optimized for smallest possible image size:
#   - Multi-stage build → dev tools stay in build stage
#   - node:22-alpine → ~50MB base (vs ~200MB for full Debian)
#   - Non-root user → security best practice
#   - Prisma: migration on startup (connect to external DB)
#
# Usage:
#   docker build -t probayo-api:latest .
#   docker run -d --name probayo-api -p 3001:3001 --env-file .env.production probayo-api:latest
# ============================================================

# ─────────────────────────────────────────────────────────────
# Stage 1: Install dependencies & build
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# ── Layer 1: Install system CA certificates & dependencies ──
# Alpine omits root CA certs; we need them for TLS/SSL to TiDB Cloud
RUN apk add --no-cache ca-certificates && update-ca-certificates

COPY package*.json ./
COPY prisma/ ./prisma/

# Install ALL dependencies (including devDeps needed for build)
# Uses npm ci for deterministic, reproducible builds (lockfile exists)
RUN npm ci

# ── Layer 2: Copy source code ──
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY src/ ./src/
COPY test/ ./test/

# ── Layer 3: Generate Prisma client & build NestJS ──
RUN npx prisma generate && \
    npm run build

# ── Layer 4: Prune devDependencies ──
RUN npm prune --omit=dev && \
    PRISMA_VER=$(node -p "require('@prisma/client/package.json').version") && \
    npm install --no-save prisma@$PRISMA_VER

# ─────────────────────────────────────────────────────────────
# Stage 2: Production runtime — smallest possible image
# ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

# Install only what Prisma engine needs at runtime
# ca-certificates required for TLS/SSL to TiDB Cloud (Prisma engine verification)
RUN apk add --no-cache openssl ca-certificates && update-ca-certificates

# Copy only what's needed to run
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/package.json ./

# Remove noise: cache files, unused Prisma engines for other platforms
RUN rm -rf node_modules/.cache && \
    find /app/node_modules/.prisma/client -name "*.so*" -not -name "*alpine*" -delete 2>/dev/null; \
    find /app/node_modules/.prisma/client -name "*.node" -not -name "*alpine*" -delete 2>/dev/null; \
    rm -rf /app/node_modules/.prisma/client/*.wasm 2>/dev/null; \
    true

# Run as non-root with uploads directory for persistent file storage
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads /app/prisma

ENV NODE_ENV=production HOME=/app
USER appuser
EXPOSE 3001

# ── Healthcheck ─────────────────────────────────────────────
# Uses the lightweight /health/live endpoint (no DB/Redis needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# ── Startup command ─────────────────────────────────────────
# 1. Run pending database migrations
# 2. Start the NestJS API
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]

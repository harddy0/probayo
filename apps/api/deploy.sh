#!/bin/bash
# ============================================================
# deploy.sh — Deploy Probayo API on a VPS
# No Docker Compose needed. Single container.
# ============================================================
# Usage:
#   ./deploy.sh                         # Use default image name
#   ./deploy.sh probayo-api:latest
#   ./deploy.sh probayo-api:latest --migrate-only   # Only run migrations
#
# Make sure you have a .env.production in the same directory.
# ============================================================

set -e

IMAGE="${1:-probayo-api:latest}"
CONTAINER_NAME="probayo-api"
PORT=${PORT:-3001}
ENV_FILE="${ENV_FILE:-.env.production}"
UPLOADS_DIR="${UPLOADS_DIR:-/opt/probayo/uploads}"
FLAG="${2:-}"  # --migrate-only (optional)

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║         Probayo API — Deploy Script          ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "  Image:       $IMAGE"
echo "  Port:        $PORT"
echo "  Env file:    $ENV_FILE"
echo "  Flag:        ${FLAG:---}"
echo ""

# ── 0. Validate env file ───────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Error: $ENV_FILE not found!"
  echo "   Copy .env.example to .env.production and fill in your values."
  exit 1
fi

# ── 1. Create uploads directory (persists files across redeploys) ──
if [ ! -d "$UPLOADS_DIR" ]; then
  echo "📁 Creating uploads directory: $UPLOADS_DIR"
  mkdir -p "$UPLOADS_DIR"
fi

# ── 2. Pull the image ──────────────────────────────────────
echo "📦 Pulling image: $IMAGE"
docker pull "$IMAGE" || {
  echo "   ⚠️ Pull failed, checking local image..."
  docker image inspect "$IMAGE" >/dev/null 2>&1 || {
    echo "   ❌ Image not found locally either. Build it first:"
    echo "      docker build -f apps/api/Dockerfile -t $IMAGE ."
    exit 1
  }
  echo "   ✅ Using local image"
}

# ── 3. Handle --migrate-only flag ──────────────────────────
if [ "$FLAG" = "--migrate-only" ]; then
  echo "🔄 Running migrations only..."
  docker run --rm \
    --name "${CONTAINER_NAME}-migrate" \
    --env-file "$ENV_FILE" \
    "$IMAGE" \
    sh -c "npx prisma migrate deploy"
  echo "✅ Migrations complete!"
  exit 0
fi

# ── 4. Stop and remove old container ───────────────────────
echo "🛑 Stopping old container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# ── 5. Start new container ─────────────────────────────────
echo "🚀 Starting new container..."

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT":"$PORT" \
  -v "$UPLOADS_DIR":/app/uploads \
  --env-file "$ENV_FILE" \
  "$IMAGE"

# ── 6. Wait and check ──────────────────────────────────────
echo ""
echo "⏳ Waiting for container to start..."
sleep 3

if docker ps --filter "name=$CONTAINER_NAME" --filter "status=running" | grep -q "$CONTAINER_NAME"; then
  echo "✅ Container is running!"
  echo ""
  echo "   ┌────────────────────────────────────────────────┐"
  echo "   │  Commands:                                     │"
  echo "   │  Logs:      docker logs -f $CONTAINER_NAME   │"
  echo "   │  Shell:     docker exec -it $CONTAINER_NAME sh │"
  echo "   │  Migrate:   docker exec $CONTAINER_NAME prisma migrate deploy  │"
  echo "   │  Stop:      docker stop $CONTAINER_NAME        │"
  echo "   └────────────────────────────────────────────────┘"
else
  echo "⚠️  Container may have failed. Checking logs..."
  docker logs "$CONTAINER_NAME" --tail 20
  exit 1
fi

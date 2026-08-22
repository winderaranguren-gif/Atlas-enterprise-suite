#!/usr/bin/env bash
set -euo pipefail

IMAGE="${ATLAS_IMAGE:-ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="$ROOT/infra/laptop/compose.yml"

case "$(uname -s)" in
  Linux|Darwin) ;;
  *) echo "Use scripts/atlas-laptop-node.ps1 on Windows." >&2; exit 2 ;;
esac

command -v docker >/dev/null 2>&1 || { echo "Docker is required. Install Docker Desktop or Docker Engine first." >&2; exit 1; }
docker info >/dev/null 2>&1 || { echo "Docker is installed but the engine is not running." >&2; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required." >&2; exit 1; }
[[ "$IMAGE" =~ ^ghcr\.io/winderaranguren-gif/atlas-enterprise-suite(:[A-Za-z0-9._-]+|@sha256:[a-f0-9]{64})$ ]] || { echo "Unexpected ATLAS image." >&2; exit 1; }

export ATLAS_IMAGE="$IMAGE"
docker compose -f "$COMPOSE" pull
docker compose -f "$COMPOSE" up -d

for _ in $(seq 1 45); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' atlas-laptop-01 2>/dev/null || true)"
  [[ "$status" == "healthy" ]] && break
  [[ "$status" == "unhealthy" ]] && { docker logs --tail 120 atlas-laptop-01 >&2 || true; exit 1; }
  sleep 2
done
[[ "$(docker inspect --format '{{.State.Health.Status}}' atlas-laptop-01 2>/dev/null || true)" == "healthy" ]] || { echo "ATLAS laptop node did not become healthy." >&2; exit 1; }

curl -fsS http://127.0.0.1:8080/_atlas/health >/dev/null
cat <<EOF
ATLAS LAPTOP NODE READY
Node: atlas-laptop-01
Runtime: $IMAGE
Local URL: http://127.0.0.1:8080
State: atlas_laptop_state
Exposure: localhost only
EOF

#!/usr/bin/env bash
set -euo pipefail

ROOT="${ATLAS_VPS_ROOT:-/opt/atlas-vps}"
IMAGE="${1:-${ATLAS_IMAGE:-}}"
PUBLIC_URL="${ATLAS_PUBLIC_URL:-}"

[[ -n "$IMAGE" ]] || { echo "Usage: atlas-vps-deploy <ghcr image tag or digest>" >&2; exit 2; }
if ! [[ "$IMAGE" =~ ^ghcr\.io/winderaranguren-gif/atlas-enterprise-suite(:[A-Za-z0-9._-]+|@sha256:[a-f0-9]{64})$ ]]; then
  echo "Refusing unexpected ATLAS image: $IMAGE" >&2; exit 1
fi
[[ -d "$ROOT" && -f "$ROOT/compose.yml" && -f "$ROOT/.env" ]] || { echo "ATLAS VPS is not bootstrapped at $ROOT" >&2; exit 1; }

cd "$ROOT"
cp -a .env .env.previous
rollback(){
  echo "ATLAS health gate failed. Rolling back." >&2
  cp -a .env.previous .env
  docker compose -f compose.yml up -d atlas edge || true
}
trap 'rollback' ERR

awk -v image="$IMAGE" '
  BEGIN{done=0}
  /^ATLAS_IMAGE=/{print "ATLAS_IMAGE=" image; done=1; next}
  {print}
  END{if(!done) print "ATLAS_IMAGE=" image}
' .env >.env.next
chmod 0600 .env.next
mv .env.next .env

docker compose -f compose.yml pull atlas
docker compose -f compose.yml up -d atlas

healthy=0
for _ in $(seq 1 60); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' atlas-app 2>/dev/null || true)"
  if [[ "$status" == "healthy" ]]; then healthy=1; break; fi
  [[ "$status" == "unhealthy" ]] && break
  sleep 2
done
[[ "$healthy" == "1" ]] || { docker logs --tail 160 atlas-app >&2 || true; false; }

docker compose -f compose.yml up -d edge
curl -fsS http://127.0.0.1/_atlas/health >/tmp/atlas-vps-health.json

if [[ -n "$PUBLIC_URL" ]]; then
  base="${PUBLIC_URL%/}"
  curl --retry 8 --retry-delay 2 --retry-all-errors -fsS "$base/_atlas/health" >/tmp/atlas-vps-public-health.json
  curl --retry 8 --retry-delay 2 --retry-all-errors -fsS "$base/_atlas/runtime" >/tmp/atlas-vps-public-runtime.json
fi

trap - ERR
rm -f .env.previous
container_image="$(docker inspect --format '{{.Config.Image}}' atlas-app)"
echo "ATLAS VPS DEPLOYED"
echo "Image: $container_image"
echo "Health: healthy"
[[ -n "$PUBLIC_URL" ]] && echo "Public verification: $PUBLIC_URL" || echo "Public verification: not configured"

#!/usr/bin/env bash
set -euo pipefail

usage(){
  cat <<'EOF'
ATLAS VPS bootstrap
Usage: sudo bash scripts/atlas-vps-bootstrap.sh [--domain example.com] [--image ghcr.io/...:tag] [--ssh-port 22]

Environment overrides:
  ATLAS_DOMAIN        Public DNS name. If omitted, ATLAS serves HTTP on port 80 until a domain is configured.
  ATLAS_IMAGE         OCI image to run.
  ATLAS_SSH_PORT      SSH port to preserve in UFW.
  ATLAS_ENABLE_UFW    1 to configure UFW (default), 0 to leave firewall unchanged.
EOF
}

DOMAIN="${ATLAS_DOMAIN:-}"
IMAGE="${ATLAS_IMAGE:-ghcr.io/winderaranguren-gif/atlas-enterprise-suite:latest}"
SSH_PORT="${ATLAS_SSH_PORT:-}"
ENABLE_UFW="${ATLAS_ENABLE_UFW:-1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --image) IMAGE="${2:-}"; shift 2 ;;
    --ssh-port) SSH_PORT="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done

[[ ${EUID} -eq 0 ]] || { echo "Run as root (sudo)." >&2; exit 1; }
[[ -f /etc/os-release ]] || { echo "Unsupported host: /etc/os-release missing." >&2; exit 1; }
. /etc/os-release
case "${ID:-}" in ubuntu|debian) ;; *) echo "ATLAS VPS currently supports Ubuntu/Debian hosts." >&2; exit 1 ;; esac

if [[ -n "$DOMAIN" ]] && ! [[ "$DOMAIN" =~ ^([A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ ]]; then
  echo "Invalid domain: $DOMAIN" >&2; exit 1
fi
if ! [[ "$IMAGE" =~ ^ghcr\.io/winderaranguren-gif/atlas-enterprise-suite(:[A-Za-z0-9._-]+|@sha256:[a-f0-9]{64})$ ]]; then
  echo "Refusing unexpected ATLAS image: $IMAGE" >&2; exit 1
fi
if [[ -z "$SSH_PORT" ]]; then
  SSH_PORT="$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}' || true)"
  SSH_PORT="${SSH_PORT:-22}"
fi
[[ "$SSH_PORT" =~ ^[0-9]{1,5}$ ]] && (( SSH_PORT >= 1 && SSH_PORT <= 65535 )) || { echo "Invalid SSH port: $SSH_PORT" >&2; exit 1; }

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_SOURCE="$SOURCE_ROOT/infra/vps/compose.yml"
DEPLOY_SOURCE="$SOURCE_ROOT/scripts/atlas-vps-deploy.sh"
[[ -f "$COMPOSE_SOURCE" ]] || { echo "Missing $COMPOSE_SOURCE" >&2; exit 1; }
[[ -f "$DEPLOY_SOURCE" ]] || { echo "Missing $DEPLOY_SOURCE" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl docker.io ufw
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y docker-compose-v2 2>/dev/null || apt-get install -y docker-compose-plugin 2>/dev/null || true
fi
docker compose version >/dev/null 2>&1 || { echo "Docker Compose v2 is required." >&2; exit 1; }
systemctl enable --now docker

install -d -m 0750 /opt/atlas-vps /opt/atlas-vps/bin
install -m 0640 "$COMPOSE_SOURCE" /opt/atlas-vps/compose.yml
install -m 0750 "$DEPLOY_SOURCE" /opt/atlas-vps/bin/atlas-vps-deploy

cat >/opt/atlas-vps/.env <<EOF
ATLAS_IMAGE=$IMAGE
ATLAS_DOMAIN=$DOMAIN
EOF
chmod 0600 /opt/atlas-vps/.env

if [[ -n "$DOMAIN" ]]; then
  cat >/opt/atlas-vps/Caddyfile <<EOF
$DOMAIN {
  encode zstd gzip
  reverse_proxy atlas:8080
  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains"
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
EOF
else
  cat >/opt/atlas-vps/Caddyfile <<'EOF'
:80 {
  encode zstd gzip
  reverse_proxy atlas:8080
  header {
    X-Content-Type-Options "nosniff"
    Referrer-Policy "strict-origin-when-cross-origin"
    -Server
  }
}
EOF
fi
chmod 0644 /opt/atlas-vps/Caddyfile

if [[ "$ENABLE_UFW" == "1" ]]; then
  ufw allow "${SSH_PORT}/tcp"
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 443/udp
  ufw --force enable
fi

cd /opt/atlas-vps
docker compose -f compose.yml pull
docker compose -f compose.yml up -d

for _ in $(seq 1 45); do
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' atlas-app 2>/dev/null || true)"
  [[ "$status" == "healthy" ]] && break
  [[ "$status" == "unhealthy" ]] && { docker logs --tail 120 atlas-app >&2 || true; exit 1; }
  sleep 2
done
[[ "$(docker inspect --format '{{.State.Health.Status}}' atlas-app 2>/dev/null || true)" == "healthy" ]] || { echo "ATLAS did not become healthy." >&2; exit 1; }

curl -fsS http://127.0.0.1/_atlas/health >/tmp/atlas-vps-health.json
node_ok="$(docker exec atlas-app node -e "fetch('http://127.0.0.1:8080/_atlas/health').then(r=>r.json()).then(j=>process.stdout.write(j.ok?'yes':'no')).catch(()=>process.stdout.write('no'))")"
[[ "$node_ok" == "yes" ]] || { echo "ATLAS internal health verification failed." >&2; exit 1; }

cat <<EOF
ATLAS VPS READY
Runtime: Node/OCI
Image: $IMAGE
Domain: ${DOMAIN:-not-configured}
State volume: atlas_vps_state
Local health: http://127.0.0.1/_atlas/health
Public production verification requires DNS/TLS and a reachable public URL.
EOF

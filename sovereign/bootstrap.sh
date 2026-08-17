#!/usr/bin/env bash
set -euo pipefail
if [ "${EUID:-$(id -u)}" -ne 0 ]; then echo 'Run as root'; exit 1; fi
if ! command -v node >/dev/null 2>&1; then echo 'Node.js 22+ is required'; exit 1; fi
NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 22 ]; then echo 'Node.js 22+ is required'; exit 1; fi
if ! command -v openssl >/dev/null 2>&1; then echo 'OpenSSL is required'; exit 1; fi

id atlas >/dev/null 2>&1 || useradd --system --home /opt/atlas --shell /usr/sbin/nologin atlas
install -d -o atlas -g atlas /opt/atlas/{forge/repos,releases,state,logs,runtime}
install -d -m 0750 /etc/atlas
ENV_FILE=/etc/atlas/atlas.env
if [ ! -f "$ENV_FILE" ]; then
  install -m 0600 /dev/null "$ENV_FILE"
fi
ensure_env(){
  local key="$1" value="$2"
  grep -q "^${key}=" "$ENV_FILE" || printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
}
ensure_env ATLAS_CONTROL_TOKEN "$(openssl rand -hex 32)"
ensure_env ATLAS_BOOTSTRAP_TOKEN "$(openssl rand -hex 32)"
ensure_env ATLAS_FORGE_ROOT /opt/atlas/forge/repos
ensure_env ATLAS_ROOT /opt/atlas
ensure_env ATLAS_FORGE_HOST 127.0.0.1
ensure_env ATLAS_FORGE_PORT 7401
ensure_env ATLAS_EDGE_HOST 127.0.0.1
ensure_env ATLAS_EDGE_PORT 7402
ensure_env ATLAS_RUNTIME_HOST 127.0.0.1
ensure_env ATLAS_RUNTIME_PORT 7403
ensure_env ATLAS_SQLITE_PATH /opt/atlas/state/atlas.sqlite3
ensure_env ATLAS_PUBLIC_ORIGIN https://atlasenterprisesuite.com
chmod 0600 "$ENV_FILE"

cp sovereign/atlas-forge/forge.mjs /opt/atlas/runtime/forge.mjs
cp sovereign/atlas-edge/edge.mjs /opt/atlas/runtime/edge.mjs
cp sovereign/runtime/server.mjs /opt/atlas/runtime/server.mjs
cp sovereign/runtime/d1-sqlite.mjs /opt/atlas/runtime/d1-sqlite.mjs
chown -R atlas:atlas /opt/atlas/runtime

install -m 0644 sovereign/systemd/atlas-forge.service /etc/systemd/system/atlas-forge.service
install -m 0644 sovereign/systemd/atlas-edge.service /etc/systemd/system/atlas-edge.service
install -m 0644 sovereign/systemd/atlas-runtime.service /etc/systemd/system/atlas-runtime.service
systemctl daemon-reload
systemctl enable --now atlas-forge atlas-edge atlas-runtime

if command -v caddy >/dev/null 2>&1; then
  install -m 0644 sovereign/atlas-edge/Caddyfile.template /etc/caddy/Caddyfile
  systemctl reload caddy || systemctl restart caddy
else
  echo 'Caddy is not installed. Install it before DNS cutover.'
fi

echo 'ATLAS Sovereign Core bootstrap complete.'
echo 'Forge: 127.0.0.1:7401 | Edge: 127.0.0.1:7402 | Runtime: 127.0.0.1:7403'

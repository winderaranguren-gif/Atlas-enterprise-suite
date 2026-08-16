#!/usr/bin/env bash
set -euo pipefail
if [ "${EUID:-$(id -u)}" -ne 0 ]; then echo 'Run as root'; exit 1; fi
id atlas >/dev/null 2>&1 || useradd --system --home /opt/atlas --shell /usr/sbin/nologin atlas
install -d -o atlas -g atlas /opt/atlas/{forge/repos,releases,state,logs}
install -d -m 0750 /etc/atlas
if [ ! -f /etc/atlas/atlas.env ]; then
  TOKEN="$(openssl rand -hex 32)"
  cat >/etc/atlas/atlas.env <<EOF
ATLAS_CONTROL_TOKEN=${TOKEN}
ATLAS_FORGE_ROOT=/opt/atlas/forge/repos
ATLAS_ROOT=/opt/atlas
ATLAS_FORGE_HOST=127.0.0.1
ATLAS_FORGE_PORT=7401
ATLAS_EDGE_HOST=127.0.0.1
ATLAS_EDGE_PORT=7402
EOF
  chmod 0600 /etc/atlas/atlas.env
fi
install -d -o atlas -g atlas /opt/atlas/runtime
cp sovereign/atlas-forge/forge.mjs /opt/atlas/runtime/forge.mjs
cp sovereign/atlas-edge/edge.mjs /opt/atlas/runtime/edge.mjs
chown -R atlas:atlas /opt/atlas/runtime
install -m 0644 sovereign/systemd/atlas-forge.service /etc/systemd/system/atlas-forge.service
install -m 0644 sovereign/systemd/atlas-edge.service /etc/systemd/system/atlas-edge.service
if command -v caddy >/dev/null 2>&1; then
  install -m 0644 sovereign/atlas-edge/Caddyfile.template /etc/caddy/Caddyfile
  systemctl reload caddy || true
else
  echo 'Caddy is not installed. Install it before DNS cutover.'
fi
systemctl daemon-reload
systemctl enable --now atlas-forge atlas-edge
echo 'ATLAS Sovereign Core bootstrap complete.'
echo 'Forge: 127.0.0.1:7401 | Edge: 127.0.0.1:7402'

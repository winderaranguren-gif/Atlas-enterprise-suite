#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${1:-.}"
OUT_DIR="${ATLAS_BACKUP_DIR:-$ROOT_DIR/.atlas-backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="atlas-backup-${STAMP}"
STAGE="${OUT_DIR}/${NAME}"
ARCHIVE="${OUT_DIR}/${NAME}.tar.gz"
CHECKSUM="${ARCHIVE}.sha256"

mkdir -p "$STAGE"

# Copy reconstructable repository state. Never include local secrets or generated caches.
rsync -a \
  --exclude='.git/' \
  --exclude='.atlas-backups/' \
  --exclude='node_modules/' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='*.p12' \
  --exclude='*.pfx' \
  "$ROOT_DIR/" "$STAGE/repository/"

cat > "$STAGE/backup-metadata.json" <<EOF
{
  "system": "ATLAS Enterprise Suite",
  "createdAtUtc": "${STAMP}",
  "source": "${GITHUB_REPOSITORY:-local}",
  "commit": "${GITHUB_SHA:-unknown}",
  "secretsIncluded": false,
  "integrity": "sha256"
}
EOF

(
  cd "$OUT_DIR"
  tar -czf "$(basename "$ARCHIVE")" "$(basename "$STAGE")"
  sha256sum "$(basename "$ARCHIVE")" > "$(basename "$CHECKSUM")"
)

rm -rf "$STAGE"
printf '%s\n' "$ARCHIVE"
printf '%s\n' "$CHECKSUM"

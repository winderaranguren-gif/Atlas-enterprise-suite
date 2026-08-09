#!/usr/bin/env bash
set -euo pipefail

ARCHIVE="${1:?usage: atlas-verify.sh <backup.tar.gz>}"
CHECKSUM_FILE="${2:-${ARCHIVE}.sha256}"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "ATLAS VERIFY: archive missing: $ARCHIVE" >&2
  exit 2
fi
if [[ ! -f "$CHECKSUM_FILE" ]]; then
  echo "ATLAS VERIFY: checksum missing: $CHECKSUM_FILE" >&2
  exit 3
fi

(
  cd "$(dirname "$ARCHIVE")"
  sha256sum -c "$(basename "$CHECKSUM_FILE")"
)

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

tar -xzf "$ARCHIVE" -C "$tmp"
root="$(find "$tmp" -mindepth 1 -maxdepth 1 -type d | head -n1)"

required=(
  "$root/backup-metadata.json"
  "$root/repository/atlas-sovereign-vault/manifest.json"
)

for path in "${required[@]}"; do
  [[ -f "$path" ]] || { echo "ATLAS VERIFY: missing $path" >&2; exit 4; }
done

echo "ATLAS VERIFY: integrity OK"
echo "ATLAS VERIFY: recovery manifest present"

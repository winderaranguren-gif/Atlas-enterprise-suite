#!/usr/bin/env bash
set -euo pipefail
SRC="${1:-.}"
RELEASE_ID="${2:-$(date -u +%Y%m%dT%H%M%SZ)}"
ROOT="${ATLAS_ROOT:-/opt/atlas}"
DEST="$ROOT/releases/$RELEASE_ID"
if [[ ! "$RELEASE_ID" =~ ^[A-Za-z0-9._-]+$ ]]; then echo 'Invalid release id'; exit 2; fi
if [ -e "$DEST" ]; then echo "Release already exists: $RELEASE_ID"; exit 3; fi
mkdir -p "$DEST"
cp -a "$SRC"/. "$DEST"/
find "$DEST" -type d -exec chmod 0755 {} +
find "$DEST" -type f -exec chmod 0644 {} +
if [ -f "$DEST/package.json" ] && command -v npm >/dev/null 2>&1; then
  (cd "$DEST" && npm ci --ignore-scripts --omit=dev 2>/dev/null || true)
fi
printf '{"release":"%s","createdAt":"%s"}\n' "$RELEASE_ID" "$(date -u +%FT%TZ)" >"$DEST/.atlas-release.json"
NEXT="$ROOT/current.next"
rm -f "$NEXT"
ln -s "$DEST" "$NEXT"
mv -Tf "$NEXT" "$ROOT/current"
echo "ATLAS release promoted: $RELEASE_ID"

#!/usr/bin/env sh
set -eu

REGION_ID=${1:-}
VERSION=${2:-}
SOURCE_DIR=${3:-}
OUTPUT_DIR=${4:-}
SIGNING_KEY=${ATLAS_OFFLINE_SIGNING_KEY:-}

if [ -z "$REGION_ID" ] || [ -z "$VERSION" ] || [ -z "$SOURCE_DIR" ] || [ -z "$OUTPUT_DIR" ]; then
  echo "Usage: $0 <region-id> <version> <source-dir> <output-dir>" >&2
  exit 64
fi

if [ ! -d "$SOURCE_DIR" ]; then
  echo "Source directory does not exist: $SOURCE_DIR" >&2
  exit 66
fi

for required in map routing search metadata; do
  if [ ! -e "$SOURCE_DIR/$required" ]; then
    echo "Offline source is missing required component: $required" >&2
    exit 65
  fi
done

mkdir -p "$OUTPUT_DIR"
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT INT TERM
PACKAGE_NAME="atlas-$REGION_ID-$VERSION.tar.zst"
PACKAGE_PATH="$OUTPUT_DIR/$PACKAGE_NAME"
MANIFEST_PATH="$OUTPUT_DIR/$PACKAGE_NAME.json"
SIGNATURE_PATH="$OUTPUT_DIR/$PACKAGE_NAME.sig"

cp -R "$SOURCE_DIR/map" "$WORK_DIR/map"
cp -R "$SOURCE_DIR/routing" "$WORK_DIR/routing"
cp -R "$SOURCE_DIR/search" "$WORK_DIR/search"
cp -R "$SOURCE_DIR/metadata" "$WORK_DIR/metadata"

cat > "$WORK_DIR/atlas-region.json" <<EOF
{
  "format": "atlas-region-v1",
  "regionId": "$REGION_ID",
  "version": "$VERSION",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "components": ["map", "routing", "search", "metadata"],
  "minimumAppVersion": "0.4.0"
}
EOF

# Reproducible ordering and timestamps make checksums stable for identical inputs.
find "$WORK_DIR" -exec touch -h -t 202601010000.00 {} +
if command -v zstd >/dev/null 2>&1; then
  tar --sort=name --owner=0 --group=0 --numeric-owner -C "$WORK_DIR" -cf - . | zstd -19 -T0 -o "$PACKAGE_PATH"
else
  echo "zstd is required to build ATLAS offline packages" >&2
  exit 69
fi

SHA256=$(sha256sum "$PACKAGE_PATH" | awk '{print $1}')
SIZE_BYTES=$(wc -c < "$PACKAGE_PATH" | tr -d ' ')

cat > "$MANIFEST_PATH" <<EOF
{
  "id": "$REGION_ID",
  "version": "$VERSION",
  "file": "$PACKAGE_NAME",
  "contentType": "application/vnd.atlas.region+zstd",
  "sizeBytes": $SIZE_BYTES,
  "sha256": "$SHA256",
  "signatureAlgorithm": "Ed25519",
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

if [ -n "$SIGNING_KEY" ]; then
  if [ ! -f "$SIGNING_KEY" ]; then
    echo "Signing key not found: $SIGNING_KEY" >&2
    exit 67
  fi
  openssl pkeyutl -sign -inkey "$SIGNING_KEY" -rawin -in "$PACKAGE_PATH" -out "$SIGNATURE_PATH"
  echo "Signature: $SIGNATURE_PATH"
else
  echo "ATLAS_OFFLINE_SIGNING_KEY was not set; package is not publishable." >&2
  exit 68
fi

echo "Package: $PACKAGE_PATH"
echo "Manifest: $MANIFEST_PATH"
echo "SHA-256: $SHA256"

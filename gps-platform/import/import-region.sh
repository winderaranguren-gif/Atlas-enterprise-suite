#!/usr/bin/env sh
set -eu

REGION_ID=${1:-}
PBF_URL=${2:-}
EXPECTED_SHA256=${3:-}

if [ -z "$REGION_ID" ] || [ -z "$PBF_URL" ]; then
  echo "Usage: $0 <region-id> <pbf-url> [sha256]" >&2
  exit 64
fi

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
DATA_DIR=${ATLAS_GPS_IMPORT_DIR:-"$ROOT_DIR/.atlas-gps-import"}
REGION_DIR="$DATA_DIR/$REGION_ID"
PBF_FILE="$REGION_DIR/$REGION_ID.osm.pbf"
COMPOSE_FILE="$ROOT_DIR/gps-platform/docker-compose.yml"
ENV_FILE=${ATLAS_GPS_ENV_FILE:-"$ROOT_DIR/gps-platform/.env"}
OSM2PGSQL_IMAGE=${ATLAS_OSM2PGSQL_IMAGE:-iboates/osm2pgsql:latest}

mkdir -p "$REGION_DIR"

if [ ! -f "$PBF_FILE" ]; then
  echo "Downloading $PBF_URL"
  curl --fail --location --retry 5 --continue-at - --output "$PBF_FILE" "$PBF_URL"
fi

if [ -n "$EXPECTED_SHA256" ]; then
  ACTUAL_SHA256=$(sha256sum "$PBF_FILE" | awk '{print $1}')
  if [ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]; then
    echo "Checksum mismatch for $PBF_FILE" >&2
    exit 65
  fi
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE. Copy gps-platform/.env.example and secure all secrets." >&2
  exit 66
fi

# Start the persistent database before importing.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d postgis redis minio

POSTGRES_PASSWORD=$(awk -F= '/^ATLAS_POSTGRES_PASSWORD=/{print substr($0,index($0,"=")+1)}' "$ENV_FILE" | tail -n 1)
if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "ATLAS_POSTGRES_PASSWORD must be set in $ENV_FILE" >&2
  exit 67
fi

# Apply ATLAS lane, sign, speed-limit and interchange schema.
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T postgis \
  psql -U atlas_gps -d atlas_gps < "$ROOT_DIR/gps-platform/database/001_lane_intelligence.sql"

# Import the regional OSM extract into the ATLAS-controlled PostGIS database.
docker run --rm \
  --network "$(basename "$ROOT_DIR")_default" \
  -v "$REGION_DIR:/data:ro" \
  -e PGPASSWORD="$POSTGRES_PASSWORD" \
  "$OSM2PGSQL_IMAGE" \
  osm2pgsql \
    --create \
    --slim \
    --drop \
    --database atlas_gps \
    --host postgis \
    --username atlas_gps \
    --output flex \
    --style /usr/share/osm2pgsql/flex-config/generic.lua \
    "/data/$REGION_ID.osm.pbf"

# Rebuild routing and search services for the imported extract.
ATLAS_OSM_PBF_URL="file:///custom_files/$REGION_ID.osm.pbf" \
ATLAS_FORCE_ROUTING_REBUILD=True \
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --force-recreate valhalla

cat > "$REGION_DIR/import.json" <<EOF
{
  "regionId": "$REGION_ID",
  "sourceUrl": "$PBF_URL",
  "sha256": "$(sha256sum "$PBF_FILE" | awk '{print $1}')",
  "importedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "ATLAS GPS region import staged for $REGION_ID."

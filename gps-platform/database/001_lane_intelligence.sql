BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS atlas_gps;

CREATE TABLE IF NOT EXISTS atlas_gps.road_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source text NOT NULL,
  external_id text NOT NULL,
  country_code text,
  jurisdiction text,
  road_name text,
  road_ref text,
  direction text,
  road_class text,
  layer smallint NOT NULL DEFAULT 0,
  bridge boolean NOT NULL DEFAULT false,
  tunnel boolean NOT NULL DEFAULT false,
  toll boolean NOT NULL DEFAULT false,
  access_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  surface text,
  lane_count smallint,
  geometry geometry(LineString, 4326) NOT NULL,
  source_updated_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_source, external_id)
);

CREATE INDEX IF NOT EXISTS road_segments_geometry_gix ON atlas_gps.road_segments USING gist (geometry);
CREATE INDEX IF NOT EXISTS road_segments_country_idx ON atlas_gps.road_segments (country_code, jurisdiction);

CREATE TABLE IF NOT EXISTS atlas_gps.lanes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_segment_id uuid NOT NULL REFERENCES atlas_gps.road_segments(id) ON DELETE CASCADE,
  lane_index smallint NOT NULL,
  travel_direction text,
  lane_type text NOT NULL DEFAULT 'general',
  allowed_modes text[] NOT NULL DEFAULT ARRAY['car']::text[],
  turn_indications text[] NOT NULL DEFAULT '{}'::text[],
  destination_labels text[] NOT NULL DEFAULT '{}'::text[],
  through boolean,
  reversible boolean NOT NULL DEFAULT false,
  active_schedule jsonb,
  width_meters numeric(5,2),
  geometry geometry(LineString, 4326),
  source_confidence numeric(4,3) CHECK (source_confidence BETWEEN 0 AND 1),
  UNIQUE (road_segment_id, lane_index, travel_direction)
);

CREATE INDEX IF NOT EXISTS lanes_geometry_gix ON atlas_gps.lanes USING gist (geometry);

CREATE TABLE IF NOT EXISTS atlas_gps.lane_connectivity (
  from_lane_id uuid NOT NULL REFERENCES atlas_gps.lanes(id) ON DELETE CASCADE,
  to_lane_id uuid NOT NULL REFERENCES atlas_gps.lanes(id) ON DELETE CASCADE,
  maneuver text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  schedule jsonb,
  restriction_reason text,
  source_confidence numeric(4,3) CHECK (source_confidence BETWEEN 0 AND 1),
  PRIMARY KEY (from_lane_id, to_lane_id, maneuver)
);

CREATE TABLE IF NOT EXISTS atlas_gps.traffic_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source text NOT NULL,
  external_id text NOT NULL,
  road_segment_id uuid REFERENCES atlas_gps.road_segments(id) ON DELETE SET NULL,
  lane_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  sign_type text NOT NULL,
  sign_code text,
  text_primary text,
  text_secondary text,
  language_codes text[] NOT NULL DEFAULT '{}'::text[],
  direction_degrees numeric(6,2),
  geometry geometry(Point, 4326) NOT NULL,
  valid_from timestamptz,
  valid_to timestamptz,
  source_confidence numeric(4,3) CHECK (source_confidence BETWEEN 0 AND 1),
  UNIQUE (external_source, external_id)
);

CREATE INDEX IF NOT EXISTS traffic_signs_geometry_gix ON atlas_gps.traffic_signs USING gist (geometry);

CREATE TABLE IF NOT EXISTS atlas_gps.speed_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  road_segment_id uuid NOT NULL REFERENCES atlas_gps.road_segments(id) ON DELETE CASCADE,
  lane_id uuid REFERENCES atlas_gps.lanes(id) ON DELETE CASCADE,
  value_kph numeric(6,2) NOT NULL CHECK (value_kph > 0),
  vehicle_class text NOT NULL DEFAULT 'all',
  condition jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_from timestamptz,
  valid_to timestamptz,
  source text NOT NULL,
  source_confidence numeric(4,3) CHECK (source_confidence BETWEEN 0 AND 1)
);

CREATE INDEX IF NOT EXISTS speed_limits_segment_idx ON atlas_gps.speed_limits (road_segment_id, vehicle_class);

CREATE TABLE IF NOT EXISTS atlas_gps.interchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_source text NOT NULL,
  external_id text NOT NULL,
  name text,
  interchange_type text,
  country_code text,
  level_count smallint,
  geometry geometry(Geometry, 4326) NOT NULL,
  lane_graph jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at timestamptz,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_source, external_id)
);

CREATE INDEX IF NOT EXISTS interchanges_geometry_gix ON atlas_gps.interchanges USING gist (geometry);

CREATE TABLE IF NOT EXISTS atlas_gps.dynamic_road_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  severity text,
  status text NOT NULL DEFAULT 'active',
  affected_modes text[] NOT NULL DEFAULT '{}'::text[],
  road_segment_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  geometry geometry(Geometry, 4326) NOT NULL,
  starts_at timestamptz,
  ends_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS dynamic_road_events_geometry_gix ON atlas_gps.dynamic_road_events USING gist (geometry);
CREATE INDEX IF NOT EXISTS dynamic_road_events_active_idx ON atlas_gps.dynamic_road_events (status, starts_at, ends_at);

CREATE OR REPLACE VIEW atlas_gps.active_road_events AS
SELECT *
FROM atlas_gps.dynamic_road_events
WHERE status = 'active'
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now());

COMMIT;

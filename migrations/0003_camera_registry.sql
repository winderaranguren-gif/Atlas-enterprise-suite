PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS atlas_camera_devices (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  vendor TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL,
  location_label TEXT NOT NULL DEFAULT '',
  transport TEXT NOT NULL DEFAULT 'unknown' CHECK(transport IN ('unknown','webrtc','rtsp','onvif','matter-camera','evidence-import')),
  capabilities TEXT NOT NULL DEFAULT '[]',
  connection_state TEXT NOT NULL DEFAULT 'unsupported' CHECK(connection_state IN ('online','offline','degraded','unsupported','discovery-pending')),
  external_device_ref TEXT NOT NULL DEFAULT '',
  last_seen_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_camera_devices_scope ON atlas_camera_devices(organization_id,dba_id,updated_at);

CREATE TABLE IF NOT EXISTS atlas_camera_evidence (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK(byte_size >= 0),
  captured_at TEXT,
  ingested_at TEXT NOT NULL,
  provenance TEXT NOT NULL DEFAULT '{}',
  immutable INTEGER NOT NULL DEFAULT 1 CHECK(immutable = 1),
  FOREIGN KEY(device_id) REFERENCES atlas_camera_devices(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_camera_evidence_scope ON atlas_camera_evidence(organization_id,dba_id,ingested_at);
CREATE INDEX IF NOT EXISTS idx_camera_evidence_hash ON atlas_camera_evidence(sha256);

-- Kangaroo is intentionally not pre-registered here. A real device record is created only after
-- authorized discovery or explicit user-authorized evidence import verifies the device identity.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS public_contact_requests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT NOT NULL,
  interest TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status IN ('new','reviewing','qualified','closed','spam'))
);
CREATE INDEX IF NOT EXISTS idx_public_contact_status_created ON public_contact_requests(status,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_contact_email ON public_contact_requests(email);

CREATE TABLE IF NOT EXISTS web_telemetry_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (event_type IN ('client_error','route_404'))
);
CREATE INDEX IF NOT EXISTS idx_web_telemetry_type_created ON web_telemetry_events(event_type,created_at DESC);

CREATE TABLE IF NOT EXISTS creative_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  operation TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  prompt TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  provider_job_id TEXT,
  output_ref TEXT,
  settings_json TEXT NOT NULL DEFAULT '{}',
  error_json TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creative_jobs_scope_updated
  ON creative_jobs(organization_id,dba_id,updated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_creative_jobs_provider_job
  ON creative_jobs(provider,provider_job_id)
  WHERE provider_job_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS creative_characters (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  reference_asset_ref TEXT,
  profile_json TEXT NOT NULL DEFAULT '{}',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_creative_characters_scope_name
  ON creative_characters(organization_id,dba_id,name);

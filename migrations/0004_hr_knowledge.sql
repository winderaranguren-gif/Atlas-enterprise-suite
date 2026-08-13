PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hr_people (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  user_id TEXT,
  person_type TEXT NOT NULL DEFAULT 'employee',
  employee_number TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  department TEXT,
  job_title TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  hired_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  UNIQUE (organization_id, dba_id, employee_number),
  CHECK (person_type IN ('employee','candidate','contractor','intern','volunteer')),
  CHECK (status IN ('active','onboarding','inactive','offboarded','rejected'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_people_scope_email
  ON hr_people(organization_id, dba_id, lower(email))
  WHERE email IS NOT NULL AND length(trim(email)) > 0;
CREATE INDEX IF NOT EXISTS idx_hr_people_scope_status
  ON hr_people(organization_id, dba_id, status, person_type);

CREATE TABLE IF NOT EXISTS hr_knowledge_items (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'article',
  category TEXT,
  summary TEXT,
  content_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  owner_user_id TEXT,
  published_at TEXT,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id, dba_id, slug),
  UNIQUE (id, organization_id, dba_id),
  CHECK (kind IN ('article','policy','procedure','course','playbook','faq','reference')),
  CHECK (status IN ('draft','published','archived')),
  CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_hr_knowledge_items_scope_status
  ON hr_knowledge_items(organization_id, dba_id, status, kind, updated_at);

CREATE TABLE IF NOT EXISTS hr_knowledge_assignments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  knowledge_item_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  assigned_by_user_id TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'assigned',
  due_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  score REAL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (knowledge_item_id, organization_id, dba_id)
    REFERENCES hr_knowledge_items(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (person_id, organization_id, dba_id)
    REFERENCES hr_people(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id, dba_id, knowledge_item_id, person_id),
  CHECK (required IN (0,1)),
  CHECK (status IN ('assigned','in_progress','completed','waived')),
  CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_hr_knowledge_assignments_person
  ON hr_knowledge_assignments(organization_id, dba_id, person_id, status, due_at);

CREATE TABLE IF NOT EXISTS hr_skill_catalog (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (organization_id, dba_id, code),
  UNIQUE (id, organization_id, dba_id),
  CHECK (status IN ('active','archived'))
);

CREATE INDEX IF NOT EXISTS idx_hr_skill_catalog_scope
  ON hr_skill_catalog(organization_id, dba_id, status, category, name);

CREATE TABLE IF NOT EXISTS hr_person_skills (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  proficiency INTEGER NOT NULL DEFAULT 1,
  verified INTEGER NOT NULL DEFAULT 0,
  verified_by_user_id TEXT,
  evidence_json TEXT,
  acquired_at TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (person_id, organization_id, dba_id)
    REFERENCES hr_people(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (skill_id, organization_id, dba_id)
    REFERENCES hr_skill_catalog(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (verified_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (organization_id, dba_id, person_id, skill_id),
  CHECK (proficiency BETWEEN 0 AND 5),
  CHECK (verified IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_hr_person_skills_person
  ON hr_person_skills(organization_id, dba_id, person_id, proficiency);

CREATE TABLE IF NOT EXISTS hr_assessment_templates (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  title TEXT NOT NULL,
  job_family TEXT,
  kind TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'draft',
  passing_score REAL NOT NULL DEFAULT 70,
  time_limit_minutes INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  created_by_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (id, organization_id, dba_id),
  CHECK (kind IN ('technical','english','compliance','onboarding','custom')),
  CHECK (status IN ('draft','active','archived')),
  CHECK (passing_score >= 0 AND passing_score <= 100),
  CHECK (time_limit_minutes IS NULL OR time_limit_minutes BETWEEN 1 AND 1440),
  CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_hr_assessment_templates_scope
  ON hr_assessment_templates(organization_id, dba_id, status, kind, job_family);

CREATE TABLE IF NOT EXISTS hr_assessment_questions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  question_type TEXT NOT NULL,
  options_json TEXT,
  correct_answer_json TEXT,
  points REAL NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (assessment_id, organization_id, dba_id)
    REFERENCES hr_assessment_templates(id, organization_id, dba_id) ON DELETE CASCADE,
  UNIQUE (organization_id, dba_id, assessment_id, sort_order),
  CHECK (question_type IN ('boolean','yes_no','short_text','multiple_choice','scenario')),
  CHECK (points > 0),
  CHECK (sort_order >= 0),
  CHECK (status IN ('active','archived'))
);

CREATE INDEX IF NOT EXISTS idx_hr_assessment_questions_assessment
  ON hr_assessment_questions(organization_id, dba_id, assessment_id, sort_order);

CREATE TABLE IF NOT EXISTS hr_assessment_attempts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started',
  score REAL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  scored_at TEXT,
  scored_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dba_id, organization_id) REFERENCES dbas(id, organization_id) ON DELETE RESTRICT,
  FOREIGN KEY (assessment_id, organization_id, dba_id)
    REFERENCES hr_assessment_templates(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (person_id, organization_id, dba_id)
    REFERENCES hr_people(id, organization_id, dba_id) ON DELETE RESTRICT,
  FOREIGN KEY (scored_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('started','submitted','scored','void')),
  CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

CREATE INDEX IF NOT EXISTS idx_hr_assessment_attempts_person
  ON hr_assessment_attempts(organization_id, dba_id, person_id, status, started_at);

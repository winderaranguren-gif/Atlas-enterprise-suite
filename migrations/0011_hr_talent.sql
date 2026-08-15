PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS hr_benefit_plans (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  plan_type TEXT NOT NULL,
  provider TEXT,
  employer_contribution_cents INTEGER NOT NULL DEFAULT 0,
  employee_contribution_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  effective_start TEXT,
  effective_end TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,code),
  CHECK(plan_type IN ('medical','dental','vision','life','disability','retirement','stipend','other')),
  CHECK(employer_contribution_cents >= 0),
  CHECK(employee_contribution_cents >= 0),
  CHECK(status IN ('active','inactive','archived'))
);
CREATE INDEX IF NOT EXISTS idx_hr_benefit_plans_scope ON hr_benefit_plans(organization_id,dba_id,status,plan_type,name);

CREATE TABLE IF NOT EXISTS hr_benefit_enrollments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  coverage_level TEXT NOT NULL DEFAULT 'employee',
  employee_contribution_cents INTEGER NOT NULL DEFAULT 0,
  employer_contribution_cents INTEGER NOT NULL DEFAULT 0,
  effective_start TEXT NOT NULL,
  effective_end TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(plan_id) REFERENCES hr_benefit_plans(id) ON DELETE RESTRICT,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  UNIQUE(organization_id,dba_id,plan_id,person_id,effective_start),
  CHECK(coverage_level IN ('employee','employee_spouse','employee_children','family','custom')),
  CHECK(employee_contribution_cents >= 0),
  CHECK(employer_contribution_cents >= 0),
  CHECK(status IN ('active','ended','waived'))
);
CREATE INDEX IF NOT EXISTS idx_hr_benefit_enrollments_scope ON hr_benefit_enrollments(organization_id,dba_id,person_id,status,effective_start);

CREATE TABLE IF NOT EXISTS hr_performance_cycles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  review_due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,name,start_date,end_date),
  CHECK(start_date <= end_date),
  CHECK(status IN ('draft','active','closed'))
);
CREATE INDEX IF NOT EXISTS idx_hr_performance_cycles_scope ON hr_performance_cycles(organization_id,dba_id,status,start_date DESC);

CREATE TABLE IF NOT EXISTS hr_performance_goals (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_value REAL,
  current_value REAL NOT NULL DEFAULT 0,
  unit TEXT,
  weight REAL NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  due_date TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(cycle_id) REFERENCES hr_performance_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  CHECK(weight > 0),
  CHECK(status IN ('active','completed','cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_hr_performance_goals_scope ON hr_performance_goals(organization_id,dba_id,cycle_id,person_id,status);

CREATE TABLE IF NOT EXISTS hr_performance_reviews (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  cycle_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  reviewer_person_id TEXT,
  reviewer_user_id TEXT,
  rating REAL,
  strengths TEXT,
  improvements TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TEXT,
  acknowledged_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(cycle_id) REFERENCES hr_performance_cycles(id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  FOREIGN KEY(reviewer_person_id) REFERENCES hr_people(id) ON DELETE SET NULL,
  UNIQUE(organization_id,dba_id,cycle_id,person_id,reviewer_person_id),
  CHECK(rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CHECK(status IN ('draft','submitted','acknowledged'))
);
CREATE INDEX IF NOT EXISTS idx_hr_performance_reviews_scope ON hr_performance_reviews(organization_id,dba_id,cycle_id,status,person_id);

CREATE TABLE IF NOT EXISTS hr_training_courses (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  required INTEGER NOT NULL DEFAULT 0,
  validity_months INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,code),
  CHECK(required IN (0,1)),
  CHECK(validity_months IS NULL OR validity_months BETWEEN 1 AND 1200),
  CHECK(status IN ('active','archived'))
);
CREATE INDEX IF NOT EXISTS idx_hr_training_courses_scope ON hr_training_courses(organization_id,dba_id,status,category,title);

CREATE TABLE IF NOT EXISTS hr_training_enrollments (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'assigned',
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  due_date TEXT,
  completed_at TEXT,
  score REAL,
  expires_at TEXT,
  assigned_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(course_id) REFERENCES hr_training_courses(id) ON DELETE RESTRICT,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  UNIQUE(organization_id,dba_id,course_id,person_id,assigned_at),
  CHECK(status IN ('assigned','in_progress','completed','waived')),
  CHECK(score IS NULL OR (score >= 0 AND score <= 100))
);
CREATE INDEX IF NOT EXISTS idx_hr_training_enrollments_scope ON hr_training_enrollments(organization_id,dba_id,person_id,status,due_date);

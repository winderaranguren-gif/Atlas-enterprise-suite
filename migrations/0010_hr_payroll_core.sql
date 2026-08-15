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
  UNIQUE(organization_id,dba_id,employee_number),
  CHECK (person_type IN ('employee','candidate','contractor','intern','volunteer')),
  CHECK (status IN ('active','onboarding','inactive','offboarded','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_hr_people_payroll_scope ON hr_people(organization_id,dba_id,status,person_type);

CREATE TABLE IF NOT EXISTS hr_positions (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  department TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,code),
  CHECK (employment_type IN ('full_time','part_time','temporary','contract','intern','volunteer')),
  CHECK (status IN ('active','inactive'))
);
CREATE INDEX IF NOT EXISTS idx_hr_positions_scope ON hr_positions(organization_id,dba_id,status,department,title);

CREATE TABLE IF NOT EXISTS hr_employment_profiles (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  position_id TEXT,
  manager_person_id TEXT,
  hire_date TEXT,
  termination_date TEXT,
  employment_status TEXT NOT NULL DEFAULT 'active',
  pay_type TEXT NOT NULL DEFAULT 'hourly',
  hourly_rate_cents INTEGER,
  annual_salary_cents INTEGER,
  overtime_eligible INTEGER NOT NULL DEFAULT 1,
  standard_hours_week REAL NOT NULL DEFAULT 40,
  pay_schedule TEXT NOT NULL DEFAULT 'biweekly',
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,person_id),
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE CASCADE,
  FOREIGN KEY(position_id) REFERENCES hr_positions(id) ON DELETE SET NULL,
  FOREIGN KEY(manager_person_id) REFERENCES hr_people(id) ON DELETE SET NULL,
  CHECK (employment_status IN ('active','on_leave','terminated')),
  CHECK (pay_type IN ('hourly','salary','unpaid')),
  CHECK (hourly_rate_cents IS NULL OR hourly_rate_cents >= 0),
  CHECK (annual_salary_cents IS NULL OR annual_salary_cents >= 0),
  CHECK (overtime_eligible IN (0,1)),
  CHECK (standard_hours_week >= 0 AND standard_hours_week <= 168),
  CHECK (pay_schedule IN ('weekly','biweekly','semimonthly','monthly'))
);
CREATE INDEX IF NOT EXISTS idx_hr_employment_scope ON hr_employment_profiles(organization_id,dba_id,employment_status,pay_type);

CREATE TABLE IF NOT EXISTS hr_jobs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  opened_at TEXT,
  closed_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (employment_type IN ('full_time','part_time','temporary','contract','intern','volunteer')),
  CHECK (status IN ('draft','open','closed','archived'))
);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_scope ON hr_jobs(organization_id,dba_id,status,department,created_at DESC);

CREATE TABLE IF NOT EXISTS hr_applications (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'applied',
  source TEXT,
  score REAL,
  notes TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,job_id,person_id),
  FOREIGN KEY(job_id) REFERENCES hr_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  CHECK (stage IN ('applied','screening','interview','assessment','offer','hired','rejected','withdrawn')),
  CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);
CREATE INDEX IF NOT EXISTS idx_hr_applications_scope ON hr_applications(organization_id,dba_id,job_id,stage,updated_at DESC);

CREATE TABLE IF NOT EXISTS hr_time_entries (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  work_date TEXT NOT NULL,
  regular_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  approved_by_user_id TEXT,
  approved_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  CHECK (regular_minutes BETWEEN 0 AND 1440),
  CHECK (overtime_minutes BETWEEN 0 AND 1440),
  CHECK (regular_minutes + overtime_minutes <= 1440),
  CHECK (status IN ('draft','submitted','approved','rejected'))
);
CREATE INDEX IF NOT EXISTS idx_hr_time_scope_date ON hr_time_entries(organization_id,dba_id,person_id,work_date DESC,status);

CREATE TABLE IF NOT EXISTS hr_pay_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  pay_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  gross_cents INTEGER NOT NULL DEFAULT 0,
  deductions_cents INTEGER NOT NULL DEFAULT 0,
  employee_tax_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  approved_by_user_id TEXT,
  approved_at TEXT,
  paid_at TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id,dba_id,period_start,period_end,pay_date),
  CHECK (period_start <= period_end),
  CHECK (status IN ('draft','calculated','approved','paid','void')),
  CHECK (gross_cents >= 0),
  CHECK (deductions_cents >= 0),
  CHECK (employee_tax_cents >= 0),
  CHECK (net_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_hr_pay_runs_scope ON hr_pay_runs(organization_id,dba_id,pay_date DESC,status);

CREATE TABLE IF NOT EXISTS hr_pay_run_items (
  id TEXT PRIMARY KEY,
  pay_run_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  regular_minutes INTEGER NOT NULL DEFAULT 0,
  overtime_minutes INTEGER NOT NULL DEFAULT 0,
  regular_pay_cents INTEGER NOT NULL DEFAULT 0,
  overtime_pay_cents INTEGER NOT NULL DEFAULT 0,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  pretax_deductions_cents INTEGER NOT NULL DEFAULT 0,
  employee_tax_cents INTEGER NOT NULL DEFAULT 0,
  posttax_deductions_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(pay_run_id,person_id),
  FOREIGN KEY(pay_run_id) REFERENCES hr_pay_runs(id) ON DELETE CASCADE,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE RESTRICT,
  CHECK (regular_minutes >= 0),
  CHECK (overtime_minutes >= 0),
  CHECK (regular_pay_cents >= 0),
  CHECK (overtime_pay_cents >= 0),
  CHECK (gross_cents >= 0),
  CHECK (pretax_deductions_cents >= 0),
  CHECK (employee_tax_cents >= 0),
  CHECK (posttax_deductions_cents >= 0),
  CHECK (net_cents >= 0)
);
CREATE INDEX IF NOT EXISTS idx_hr_pay_items_run ON hr_pay_run_items(pay_run_id,person_id);

CREATE TABLE IF NOT EXISTS hr_onboarding_tasks (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  dba_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TEXT,
  completed_by_user_id TEXT,
  notes TEXT,
  created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(person_id) REFERENCES hr_people(id) ON DELETE CASCADE,
  CHECK (status IN ('pending','in_progress','completed','waived'))
);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_scope ON hr_onboarding_tasks(organization_id,dba_id,person_id,status,due_date);

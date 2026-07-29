-- ATLAS Enterprise Suite production core
-- Multi-tenant schema, RBAC, audit, CRM, AR/AP, inventory, HR and document metadata.

create extension if not exists pgcrypto;

create type public.atlas_role as enum ('owner','admin','accounting','hr','operations','sales','viewer');
create type public.record_status as enum ('draft','active','inactive','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  avatar_url text,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  tax_id text,
  industry text,
  timezone text not null default 'America/New_York',
  currency text not null default 'USD',
  status public.record_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.atlas_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create or replace function public.is_org_member(org_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid() and m.is_active); $$;

create or replace function public.has_org_role(org_id uuid, allowed public.atlas_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.organization_members m where m.organization_id=org_id and m.user_id=auth.uid() and m.is_active and m.role=any(allowed)); $$;

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  type text not null check (type in ('customer','vendor','lead','partner')),
  name text not null,
  company_name text,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'active',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.contacts(id),
  invoice_number text not null,
  issue_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft','sent','open','partial','paid','overdue','void')),
  subtotal numeric(14,2) not null default 0,
  tax_total numeric(14,2) not null default 0,
  total numeric(14,2) generated always as (subtotal + tax_total) stored,
  balance numeric(14,2) not null default 0,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_number)
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vendor_id uuid references public.contacts(id),
  bill_number text,
  bill_date date not null default current_date,
  due_date date,
  status text not null default 'draft' check (status in ('draft','open','partial','paid','overdue','void')),
  amount numeric(14,2) not null default 0,
  balance numeric(14,2) not null default 0,
  category text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sku text not null,
  name text not null,
  description text,
  quantity numeric(14,3) not null default 0,
  reorder_point numeric(14,3) not null default 0,
  cost numeric(14,2) not null default 0,
  price numeric(14,2) not null default 0,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id),
  employee_number text,
  full_name text not null,
  email text,
  department text,
  job_title text,
  hourly_rate numeric(12,2),
  hire_date date,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, employee_number)
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_number text not null,
  entry_date date not null default current_date,
  memo text,
  status text not null default 'draft' check (status in ('draft','posted','reversed')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, entry_number)
);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references public.journal_entries(id) on delete cascade,
  account_code text not null,
  account_name text not null,
  debit numeric(14,2) not null default 0 check (debit >= 0),
  credit numeric(14,2) not null default 0 check (credit >= 0),
  check ((debit = 0 and credit > 0) or (credit = 0 and debit > 0))
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  category text,
  related_type text,
  related_id uuid,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index on public.organization_members(user_id);
create index on public.contacts(organization_id, type, name);
create index on public.invoices(organization_id, status, due_date);
create index on public.bills(organization_id, status, due_date);
create index on public.products(organization_id, sku);
create index on public.employees(organization_id, status);
create index on public.audit_events(organization_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.contacts enable row level security;
alter table public.invoices enable row level security;
alter table public.bills enable row level security;
alter table public.products enable row level security;
alter table public.employees enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.documents enable row level security;
alter table public.audit_events enable row level security;

create policy profiles_self on public.profiles for all using (id=auth.uid()) with check (id=auth.uid());
create policy organizations_read on public.organizations for select using (public.is_org_member(id));
create policy organizations_manage on public.organizations for update using (public.has_org_role(id,array['owner','admin']::public.atlas_role[]));
create policy members_read on public.organization_members for select using (public.is_org_member(organization_id));
create policy members_manage on public.organization_members for all using (public.has_org_role(organization_id,array['owner','admin']::public.atlas_role[])) with check (public.has_org_role(organization_id,array['owner','admin']::public.atlas_role[]));

create policy contacts_access on public.contacts for all using (public.is_org_member(organization_id)) with check (public.has_org_role(organization_id,array['owner','admin','sales','operations','accounting']::public.atlas_role[]));
create policy invoices_access on public.invoices for all using (public.is_org_member(organization_id)) with check (public.has_org_role(organization_id,array['owner','admin','sales','accounting']::public.atlas_role[]));
create policy bills_access on public.bills for all using (public.is_org_member(organization_id)) with check (public.has_org_role(organization_id,array['owner','admin','accounting','operations']::public.atlas_role[]));
create policy products_access on public.products for all using (public.is_org_member(organization_id)) with check (public.has_org_role(organization_id,array['owner','admin','operations','sales']::public.atlas_role[]));
create policy employees_read on public.employees for select using (public.is_org_member(organization_id));
create policy employees_manage on public.employees for all using (public.has_org_role(organization_id,array['owner','admin','hr']::public.atlas_role[])) with check (public.has_org_role(organization_id,array['owner','admin','hr']::public.atlas_role[]));
create policy journals_access on public.journal_entries for all using (public.is_org_member(organization_id)) with check (public.has_org_role(organization_id,array['owner','admin','accounting']::public.atlas_role[]));
create policy journal_lines_access on public.journal_lines for all using (exists(select 1 from public.journal_entries j where j.id=journal_entry_id and public.is_org_member(j.organization_id))) with check (exists(select 1 from public.journal_entries j where j.id=journal_entry_id and public.has_org_role(j.organization_id,array['owner','admin','accounting']::public.atlas_role[])));
create policy documents_access on public.documents for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy audit_read on public.audit_events for select using (public.has_org_role(organization_id,array['owner','admin']::public.atlas_role[]));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('atlas-documents','atlas-documents',false,26214400,array['application/pdf','image/png','image/jpeg','text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do nothing;

create policy atlas_documents_read on storage.objects for select using (bucket_id='atlas-documents' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy atlas_documents_insert on storage.objects for insert with check (bucket_id='atlas-documents' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy atlas_documents_delete on storage.objects for delete using (bucket_id='atlas-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['owner','admin']::public.atlas_role[]));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public
as $$ begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')) on conflict do nothing; return new; end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

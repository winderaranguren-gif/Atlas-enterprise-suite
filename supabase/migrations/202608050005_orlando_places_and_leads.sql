-- ATLAS Orlando Places + Business Leads
-- Adds a tenant-scoped place directory and a separate CRM prospect layer.
begin;

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  atlas_code text not null,
  name text not null,
  slug text not null,
  category text not null,
  subcategory text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country_code text not null default 'US',
  phone_primary text,
  phone_secondary text,
  website text,
  trolley_stops text[] not null default '{}',
  source_document_page integer,
  source_name text,
  source_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','verified','phone_pending','address_pending','archived')),
  futuristic_score smallint not null default 0 check (futuristic_score between 0 and 100),
  futuristic_tags text[] not null default '{}',
  display_mode text not null default 'standard' check (display_mode in ('standard','futuristic')),
  status text not null default 'staging' check (status in ('staging','published','archived')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, atlas_code),
  unique (org_id, slug, address_line1)
);

create table if not exists public.business_leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  lead_status text not null default 'new'
    check (lead_status in ('new','research','qualified','contacted','nurture','won','not_a_fit','archived')),
  priority text not null default 'medium' check (priority in ('low','medium','high','urgent')),
  contact_name text,
  contact_email text,
  contact_phone text,
  assigned_to uuid references auth.users(id),
  notes text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, place_id)
);

create index if not exists places_org_category_idx on public.places(org_id, category);
create index if not exists places_org_status_idx on public.places(org_id, status, verification_status);
create index if not exists places_org_futuristic_idx on public.places(org_id, display_mode, futuristic_score desc);
create index if not exists business_leads_org_status_idx on public.business_leads(org_id, lead_status, priority);

drop trigger if exists places_set_updated_at on public.places;
create trigger places_set_updated_at before update on public.places
for each row execute function public.set_updated_at();

drop trigger if exists business_leads_set_updated_at on public.business_leads;
create trigger business_leads_set_updated_at before update on public.business_leads
for each row execute function public.set_updated_at();

alter table public.places enable row level security;
alter table public.business_leads enable row level security;

drop policy if exists places_read on public.places;
drop policy if exists places_insert on public.places;
drop policy if exists places_update on public.places;
drop policy if exists places_delete on public.places;
create policy places_read on public.places for select to authenticated
using (public.is_org_member(org_id));
create policy places_insert on public.places for insert to authenticated
with check (public.can_write_business_data(org_id));
create policy places_update on public.places for update to authenticated
using (public.can_write_business_data(org_id))
with check (public.can_write_business_data(org_id));
create policy places_delete on public.places for delete to authenticated
using (public.has_org_role(org_id, array['owner','admin','manager']));

drop policy if exists business_leads_read on public.business_leads;
drop policy if exists business_leads_insert on public.business_leads;
drop policy if exists business_leads_update on public.business_leads;
drop policy if exists business_leads_delete on public.business_leads;
create policy business_leads_read on public.business_leads for select to authenticated
using (public.is_org_member(org_id));
create policy business_leads_insert on public.business_leads for insert to authenticated
with check (public.can_write_business_data(org_id));
create policy business_leads_update on public.business_leads for update to authenticated
using (public.can_write_business_data(org_id))
with check (public.can_write_business_data(org_id));
create policy business_leads_delete on public.business_leads for delete to authenticated
using (public.has_org_role(org_id, array['owner','admin','manager']));

grant select, insert, update, delete on public.places to authenticated;
grant select, insert, update, delete on public.business_leads to authenticated;

insert into public.organization_modules(org_id, module_code, enabled, launch_status)
select id, 'local', true, 'beta'
from public.organizations
on conflict (org_id, module_code)
do update set enabled = excluded.enabled, launch_status = excluded.launch_status, updated_at = now();

commit;

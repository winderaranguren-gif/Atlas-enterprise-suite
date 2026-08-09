-- ATLAS GPS 4D Lane Intelligence v1
-- Prepared for controlled Supabase migration. This file is not applied automatically.
begin;

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- PostGIS can already exist in a schema other than `extensions`. Resolve its
-- actual namespace for this transaction instead of assuming CREATE EXTENSION
-- relocated an existing installation.
select set_config(
  'search_path',
  format('%I,public,pg_catalog', n.nspname),
  true
)
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname = 'postgis';

create table if not exists public.gps_road_segments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  external_source text not null,
  external_id text not null,
  country_code text,
  jurisdiction text,
  road_name text,
  road_ref text,
  direction text,
  road_class text,
  layer smallint not null default 0,
  bridge boolean not null default false,
  tunnel boolean not null default false,
  toll boolean not null default false,
  access_rules jsonb not null default '{}'::jsonb,
  surface text,
  lane_count smallint check (lane_count is null or lane_count >= 0),
  geometry geometry(LineString,4326) not null,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (org_id, external_source, external_id),
  unique (id, org_id)
);

create index if not exists gps_road_segments_geometry_gix on public.gps_road_segments using gist (geometry);
create index if not exists gps_road_segments_org_country_idx on public.gps_road_segments (org_id, country_code, jurisdiction);

create table if not exists public.gps_lanes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  road_segment_id uuid not null,
  lane_index smallint not null check (lane_index >= 0),
  travel_direction text not null default 'unknown',
  lane_type text not null default 'general',
  allowed_modes text[] not null default array['car']::text[],
  turn_indications text[] not null default '{}'::text[],
  destination_labels text[] not null default '{}'::text[],
  through boolean,
  reversible boolean not null default false,
  active_schedule jsonb,
  width_meters numeric(5,2) check (width_meters is null or width_meters > 0),
  geometry geometry(LineString,4326),
  source_confidence numeric(4,3) check (source_confidence between 0 and 1),
  created_by uuid default auth.uid(),
  constraint gps_lanes_segment_org_fk foreign key (road_segment_id, org_id)
    references public.gps_road_segments(id, org_id) on delete cascade,
  unique (org_id, road_segment_id, lane_index, travel_direction),
  unique (id, org_id),
  unique (id, org_id, road_segment_id)
);

create index if not exists gps_lanes_geometry_gix on public.gps_lanes using gist (geometry);
create index if not exists gps_lanes_org_segment_idx on public.gps_lanes (org_id, road_segment_id);

create table if not exists public.gps_lane_connectivity (
  org_id uuid not null references public.organizations(id) on delete cascade,
  from_lane_id uuid not null,
  to_lane_id uuid not null,
  maneuver text not null,
  allowed boolean not null default true,
  schedule jsonb,
  restriction_reason text,
  source_confidence numeric(4,3) check (source_confidence between 0 and 1),
  created_by uuid default auth.uid(),
  constraint gps_lane_connectivity_from_org_fk foreign key (from_lane_id, org_id)
    references public.gps_lanes(id, org_id) on delete cascade,
  constraint gps_lane_connectivity_to_org_fk foreign key (to_lane_id, org_id)
    references public.gps_lanes(id, org_id) on delete cascade,
  primary key (org_id, from_lane_id, to_lane_id, maneuver)
);

create index if not exists gps_lane_connectivity_org_to_lane_idx on public.gps_lane_connectivity (org_id, to_lane_id);

create table if not exists public.gps_traffic_signs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  external_source text not null,
  external_id text not null,
  road_segment_id uuid,
  sign_type text not null,
  sign_code text,
  text_primary text,
  text_secondary text,
  language_codes text[] not null default '{}'::text[],
  direction_degrees numeric(6,2) check (direction_degrees is null or (direction_degrees >= 0 and direction_degrees < 360)),
  geometry geometry(Point,4326) not null,
  valid_from timestamptz,
  valid_to timestamptz,
  source_confidence numeric(4,3) check (source_confidence between 0 and 1),
  created_by uuid default auth.uid(),
  constraint gps_traffic_signs_valid_window check (valid_from is null or valid_to is null or valid_to >= valid_from),
  constraint gps_traffic_signs_segment_org_fk foreign key (road_segment_id, org_id)
    references public.gps_road_segments(id, org_id) on delete set null (road_segment_id),
  unique (org_id, external_source, external_id),
  unique (id, org_id)
);

create index if not exists gps_traffic_signs_geometry_gix on public.gps_traffic_signs using gist (geometry);
create index if not exists gps_traffic_signs_org_segment_idx on public.gps_traffic_signs (org_id, road_segment_id);

create table if not exists public.gps_sign_lanes (
  org_id uuid not null references public.organizations(id) on delete cascade,
  sign_id uuid not null,
  lane_id uuid not null,
  constraint gps_sign_lanes_sign_org_fk foreign key (sign_id, org_id)
    references public.gps_traffic_signs(id, org_id) on delete cascade,
  constraint gps_sign_lanes_lane_org_fk foreign key (lane_id, org_id)
    references public.gps_lanes(id, org_id) on delete cascade,
  primary key (org_id, sign_id, lane_id)
);

create index if not exists gps_sign_lanes_org_lane_idx on public.gps_sign_lanes (org_id, lane_id);

create table if not exists public.gps_speed_limits (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  road_segment_id uuid not null,
  lane_id uuid,
  value_kph numeric(6,2) not null check (value_kph > 0),
  vehicle_class text not null default 'all',
  condition jsonb not null default '{}'::jsonb,
  valid_from timestamptz,
  valid_to timestamptz,
  source text not null,
  source_confidence numeric(4,3) check (source_confidence between 0 and 1),
  created_by uuid default auth.uid(),
  constraint gps_speed_limits_valid_window check (valid_from is null or valid_to is null or valid_to >= valid_from),
  constraint gps_speed_limits_segment_org_fk foreign key (road_segment_id, org_id)
    references public.gps_road_segments(id, org_id) on delete cascade,
  constraint gps_speed_limits_lane_segment_org_fk foreign key (lane_id, org_id, road_segment_id)
    references public.gps_lanes(id, org_id, road_segment_id) on delete set null (lane_id)
);

create index if not exists gps_speed_limits_org_segment_idx on public.gps_speed_limits (org_id, road_segment_id, vehicle_class);
create index if not exists gps_speed_limits_org_lane_segment_idx on public.gps_speed_limits (org_id, lane_id, road_segment_id);

create table if not exists public.gps_interchanges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  external_source text not null,
  external_id text not null,
  name text,
  interchange_type text,
  country_code text,
  level_count smallint check (level_count is null or level_count >= 0),
  geometry geometry(Geometry,4326) not null,
  lane_graph jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  imported_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (org_id, external_source, external_id),
  unique (id, org_id)
);

create index if not exists gps_interchanges_geometry_gix on public.gps_interchanges using gist (geometry);
create index if not exists gps_interchanges_org_country_idx on public.gps_interchanges (org_id, country_code);

create table if not exists public.gps_dynamic_road_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  severity text,
  status text not null default 'active',
  affected_modes text[] not null default '{}'::text[],
  geometry geometry(Geometry,4326) not null,
  starts_at timestamptz,
  ends_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  constraint gps_dynamic_road_events_valid_window check (starts_at is null or ends_at is null or ends_at >= starts_at),
  unique (org_id, provider, provider_event_id),
  unique (id, org_id)
);

create index if not exists gps_dynamic_road_events_geometry_gix on public.gps_dynamic_road_events using gist (geometry);
create index if not exists gps_dynamic_road_events_active_idx on public.gps_dynamic_road_events (org_id, status, starts_at, ends_at);

create table if not exists public.gps_event_road_segments (
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_id uuid not null,
  road_segment_id uuid not null,
  constraint gps_event_segments_event_org_fk foreign key (event_id, org_id)
    references public.gps_dynamic_road_events(id, org_id) on delete cascade,
  constraint gps_event_segments_road_org_fk foreign key (road_segment_id, org_id)
    references public.gps_road_segments(id, org_id) on delete cascade,
  primary key (org_id, event_id, road_segment_id)
);

create index if not exists gps_event_road_segments_org_road_idx on public.gps_event_road_segments (org_id, road_segment_id);

create or replace view public.gps_active_road_events
with (security_invoker = true)
as
select *
from public.gps_dynamic_road_events
where status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at >= now());

alter table public.gps_road_segments enable row level security;
alter table public.gps_lanes enable row level security;
alter table public.gps_lane_connectivity enable row level security;
alter table public.gps_traffic_signs enable row level security;
alter table public.gps_sign_lanes enable row level security;
alter table public.gps_speed_limits enable row level security;
alter table public.gps_interchanges enable row level security;
alter table public.gps_dynamic_road_events enable row level security;
alter table public.gps_event_road_segments enable row level security;

-- Members may read organization-scoped map data. Only owner/admin/manager roles
-- may insert, update, or delete it. UPDATE also applies the role predicate to
-- the existing row so a non-manager cannot mutate or remove data through USING.
create policy gps_road_segments_read on public.gps_road_segments for select to authenticated using (public.is_org_member(org_id));
create policy gps_road_segments_insert on public.gps_road_segments for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_road_segments_update on public.gps_road_segments for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_road_segments_delete on public.gps_road_segments for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_lanes_read on public.gps_lanes for select to authenticated using (public.is_org_member(org_id));
create policy gps_lanes_insert on public.gps_lanes for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_lanes_update on public.gps_lanes for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_lanes_delete on public.gps_lanes for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_lane_connectivity_read on public.gps_lane_connectivity for select to authenticated using (public.is_org_member(org_id));
create policy gps_lane_connectivity_insert on public.gps_lane_connectivity for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_lane_connectivity_update on public.gps_lane_connectivity for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_lane_connectivity_delete on public.gps_lane_connectivity for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_traffic_signs_read on public.gps_traffic_signs for select to authenticated using (public.is_org_member(org_id));
create policy gps_traffic_signs_insert on public.gps_traffic_signs for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_traffic_signs_update on public.gps_traffic_signs for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_traffic_signs_delete on public.gps_traffic_signs for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_sign_lanes_read on public.gps_sign_lanes for select to authenticated using (public.is_org_member(org_id));
create policy gps_sign_lanes_insert on public.gps_sign_lanes for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_sign_lanes_update on public.gps_sign_lanes for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_sign_lanes_delete on public.gps_sign_lanes for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_speed_limits_read on public.gps_speed_limits for select to authenticated using (public.is_org_member(org_id));
create policy gps_speed_limits_insert on public.gps_speed_limits for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_speed_limits_update on public.gps_speed_limits for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_speed_limits_delete on public.gps_speed_limits for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_interchanges_read on public.gps_interchanges for select to authenticated using (public.is_org_member(org_id));
create policy gps_interchanges_insert on public.gps_interchanges for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_interchanges_update on public.gps_interchanges for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_interchanges_delete on public.gps_interchanges for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_dynamic_road_events_read on public.gps_dynamic_road_events for select to authenticated using (public.is_org_member(org_id));
create policy gps_dynamic_road_events_insert on public.gps_dynamic_road_events for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_dynamic_road_events_update on public.gps_dynamic_road_events for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_dynamic_road_events_delete on public.gps_dynamic_road_events for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

create policy gps_event_road_segments_read on public.gps_event_road_segments for select to authenticated using (public.is_org_member(org_id));
create policy gps_event_road_segments_insert on public.gps_event_road_segments for insert to authenticated with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_event_road_segments_update on public.gps_event_road_segments for update to authenticated using (public.has_org_role(org_id,array['owner','admin','manager'])) with check (public.has_org_role(org_id,array['owner','admin','manager']));
create policy gps_event_road_segments_delete on public.gps_event_road_segments for delete to authenticated using (public.has_org_role(org_id,array['owner','admin','manager']));

grant select,insert,update,delete on public.gps_road_segments,public.gps_lanes,public.gps_lane_connectivity,
  public.gps_traffic_signs,public.gps_sign_lanes,public.gps_speed_limits,public.gps_interchanges,
  public.gps_dynamic_road_events,public.gps_event_road_segments to authenticated;
grant select on public.gps_active_road_events to authenticated;

commit;

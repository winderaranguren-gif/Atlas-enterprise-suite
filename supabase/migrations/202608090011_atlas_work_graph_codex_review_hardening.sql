-- ATLAS Work Graph post-review hardening
-- Fixes authorization-bearing execution updates, graph-cycle concurrency,
-- same-project hierarchy integrity, execution/unit project consistency, and
-- tenant-wide cascade semantics without rewriting already-applied migrations.
begin;

-- Parent relationships and execution references need a project-scoped key.
alter table public.atlas_work_units
  drop constraint if exists atlas_work_units_org_project_id_key;
alter table public.atlas_work_units
  add constraint atlas_work_units_org_project_id_key unique (org_id, project_id, id);

-- Parent units must live inside the same project. Keep parent deletion cascading
-- within that project, while the project-level cascade remains authoritative.
alter table public.atlas_work_units
  drop constraint if exists atlas_work_units_parent_fk;
alter table public.atlas_work_units
  add constraint atlas_work_units_parent_fk
  foreign key (org_id, project_id, parent_work_unit_id)
  references public.atlas_work_units(org_id, project_id, id)
  on delete cascade;

-- A conversation execution may reference only a work unit belonging to the
-- exact project recorded on the execution row. Deferring the graph references
-- preserves tenant-wide ON DELETE CASCADE while still preventing standalone
-- project/unit deletion when an execution remains.
alter table public.atlas_conversation_executions
  drop constraint if exists atlas_conversation_executions_project_fk;
alter table public.atlas_conversation_executions
  add constraint atlas_conversation_executions_project_fk
  foreign key (org_id, project_id)
  references public.atlas_work_projects(org_id, id)
  on delete no action
  deferrable initially deferred;

alter table public.atlas_conversation_executions
  drop constraint if exists atlas_conversation_executions_work_unit_fk;
alter table public.atlas_conversation_executions
  add constraint atlas_conversation_executions_work_unit_fk
  foreign key (org_id, project_id, work_unit_id)
  references public.atlas_work_units(org_id, project_id, id)
  on delete no action
  deferrable initially deferred;

-- Serialize active dependency edits per organization so two concurrent opposite
-- edges cannot both pass READ COMMITTED visibility and commit a cycle.
create or replace function public.guard_atlas_work_dependency_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  creates_cycle boolean;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if new.predecessor_work_unit_id = new.successor_work_unit_id then
    raise exception 'A work unit cannot depend on itself';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atlas-work-dependency:' || new.org_id::text, 0));

  with recursive downstream(work_unit_id) as (
    select new.successor_work_unit_id
    union
    select d.successor_work_unit_id
      from public.atlas_work_dependencies d
      join downstream x on d.predecessor_work_unit_id = x.work_unit_id
     where d.org_id = new.org_id
       and d.status = 'active'
       and d.id <> new.id
  )
  select exists(
    select 1 from downstream where work_unit_id = new.predecessor_work_unit_id
  ) into creates_cycle;

  if creates_cycle then
    raise exception 'Work dependency would create a cycle';
  end if;
  return new;
end;
$$;

-- Parent links are also a graph. Serialize hierarchy edits and reject indirect
-- cycles such as A -> B -> A before they can become persistent.
create or replace function public.guard_atlas_work_unit_parent_cycle()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  creates_cycle boolean;
begin
  if new.parent_work_unit_id is null then
    return new;
  end if;

  if new.parent_work_unit_id = new.id then
    raise exception 'A work unit cannot be its own parent';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('atlas-work-parent:' || new.org_id::text || ':' || new.project_id::text, 0));

  with recursive ancestors(work_unit_id) as (
    select new.parent_work_unit_id
    union
    select u.parent_work_unit_id
      from public.atlas_work_units u
      join ancestors a on u.id = a.work_unit_id
     where u.org_id = new.org_id
       and u.project_id = new.project_id
       and u.parent_work_unit_id is not null
       and u.id <> new.id
  )
  select exists(select 1 from ancestors where work_unit_id = new.id)
    into creates_cycle;

  if creates_cycle then
    raise exception 'Work unit parent relationship would create a cycle';
  end if;
  return new;
end;
$$;

drop trigger if exists atlas_work_unit_parent_cycle on public.atlas_work_units;
create trigger atlas_work_unit_parent_cycle
before insert or update of parent_work_unit_id, project_id
on public.atlas_work_units
for each row execute function public.guard_atlas_work_unit_parent_cycle();

-- Once an execution is created it cannot silently cross tenant boundaries.
-- Any mutation that changes the authority-bearing meaning of an auto_safe row
-- must be performed by an elevated organization role, not by an ordinary writer.
create or replace function public.guard_atlas_auto_safe_policy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  elevated boolean;
  authority_changed boolean := false;
begin
  if tg_op = 'UPDATE' and new.org_id is distinct from old.org_id then
    raise exception 'Conversation executions cannot be moved between organizations';
  end if;

  elevated := public.has_org_role(new.org_id, array['owner','admin','manager']);

  if tg_op = 'UPDATE' then
    authority_changed :=
      new.requested_action is distinct from old.requested_action
      or new.intent is distinct from old.intent
      or new.status is distinct from old.status
      or new.execution_policy is distinct from old.execution_policy
      or new.project_id is distinct from old.project_id
      or new.work_unit_id is distinct from old.work_unit_id;
  end if;

  if new.execution_policy = 'auto_safe' and not elevated then
    raise exception 'auto_safe execution policy requires owner, admin or manager role';
  end if;

  if tg_op = 'UPDATE'
     and old.execution_policy = 'auto_safe'
     and authority_changed
     and not elevated then
    raise exception 'Modifying an authorized auto_safe execution requires owner, admin or manager role';
  end if;

  return new;
end;
$$;

drop trigger if exists atlas_conversation_auto_safe_guard on public.atlas_conversation_executions;
create trigger atlas_conversation_auto_safe_guard
before insert or update of org_id, requested_action, intent, status, execution_policy, project_id, work_unit_id
on public.atlas_conversation_executions
for each row execute function public.guard_atlas_auto_safe_policy();

commit;
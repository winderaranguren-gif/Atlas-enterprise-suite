begin;

insert into public.atlas_module_registry(org_id,module_code,enabled,launch_status,data_backend,config)
select
  o.id,
  'mail',
  true,
  'active',
  'module_records',
  jsonb_build_object(
    'surface','atlas-mail.html',
    'privacy','subject_user_only',
    'analysis_mode','metadata_first',
    'message_body_required',false,
    'destructive_actions','confirmation_required',
    'provider_execution','connector_required'
  )
from public.organizations o
on conflict(org_id,module_code) do update
set enabled=true,
    launch_status='active',
    data_backend='module_records',
    config=excluded.config,
    updated_at=now();

insert into public.organization_modules(org_id,module_code,enabled,launch_status)
select o.id,'mail',true,'active'
from public.organizations o
on conflict(org_id,module_code) do update
set enabled=true,launch_status='active',updated_at=now();

-- Mail intelligence stores only saved aggregate recommendations/plans in the
-- shared module-record table. Raw imported message metadata is not persisted.
-- This restrictive policy adds a privacy boundary on top of the existing
-- organization policies: mail rows must belong to the authenticated subject.
drop policy if exists atlas_mail_records_subject_only on public.atlas_module_records;
create policy atlas_mail_records_subject_only
on public.atlas_module_records
as restrictive
for all
to authenticated
using(module_code <> 'mail' or subject_user_id=auth.uid())
with check(module_code <> 'mail' or subject_user_id=auth.uid());

commit;

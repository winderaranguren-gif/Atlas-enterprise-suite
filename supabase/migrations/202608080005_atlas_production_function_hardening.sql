-- ATLAS production hardening: explicit function privileges and pinned search paths.
begin;

alter function public.set_updated_at() set search_path = pg_catalog, public;
alter function public.try_uuid(text) set search_path = pg_catalog;
alter function public.can_write_business_data(uuid) set search_path = public, pg_temp;
alter function public.can_write_accounting_data(uuid) set search_path = public, pg_temp;
alter function public.can_manage_people(uuid) set search_path = public, pg_temp;
alter function public.guard_invoice_org() set search_path = public, pg_temp;
alter function public.guard_invoice_line_org() set search_path = public, pg_temp;
alter function public.guard_payment_org() set search_path = public, pg_temp;
alter function public.guard_expense_org() set search_path = public, pg_temp;
alter function public.guard_journal_line_org() set search_path = public, pg_temp;

-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default. Remove that broad path.
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon;

-- Trigger-only functions must not be callable as signed-in RPC endpoints.
revoke execute on function public.set_updated_at() from authenticated;
revoke execute on function public.handle_new_auth_user() from authenticated;
revoke execute on function public.audit_row_change() from authenticated;
revoke execute on function public.normalize_invoice_balance() from authenticated;
revoke execute on function public.refresh_invoice_from_payments() from authenticated;
revoke execute on function public.refresh_invoice_from_lines() from authenticated;
revoke execute on function public.prevent_unbalanced_posting() from authenticated;
revoke execute on function public.guard_invoice_org() from authenticated;
revoke execute on function public.guard_invoice_line_org() from authenticated;
revoke execute on function public.guard_payment_org() from authenticated;
revoke execute on function public.guard_expense_org() from authenticated;
revoke execute on function public.guard_journal_line_org() from authenticated;
revoke execute on function public.validate_journal_entry(uuid) from authenticated;

-- Explicit application/RLS surface.
grant execute on function public.try_uuid(text) to authenticated;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid,text[]) to authenticated;
grant execute on function public.can_write_business_data(uuid) to authenticated;
grant execute on function public.can_write_accounting_data(uuid) to authenticated;
grant execute on function public.can_manage_people(uuid) to authenticated;
grant execute on function public.create_organization(text,text,text) to authenticated;
grant execute on function public.record_invoice_payment(uuid,numeric,date) to authenticated;
grant execute on function public.create_balanced_journal_entry(uuid,text,date,text,uuid,uuid,numeric) to authenticated;

commit;

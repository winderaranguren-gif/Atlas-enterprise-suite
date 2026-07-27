-- ATLAS Core Private Beta cloud operations v0.2.4
begin;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values(new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict(id) do update set full_name = coalesce(excluded.full_name, public.profiles.full_name), updated_at = now();
  return new;
end;
$$;

drop trigger if exists atlas_auth_user_profile on auth.users;
create trigger atlas_auth_user_profile
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_uuid uuid;
  entity_id text;
begin
  organization_uuid := case when tg_op = 'DELETE' then old.org_id else new.org_id end;
  entity_id := case when tg_op = 'DELETE' then old.id::text else new.id::text end;
  insert into public.audit_logs(org_id, user_id, action, table_name, record_id, old_data, new_data)
  values(
    organization_uuid,
    auth.uid(),
    lower(tg_table_name || '.' || tg_op),
    tg_table_name,
    entity_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'customers','vendors','products','invoices','invoice_lines','payments','expense_categories',
    'expenses','chart_of_accounts','journal_entries','journal_lines','employees','documents','organization_modules'
  ] loop
    execute format('drop trigger if exists atlas_audit_%I on public.%I', table_name, table_name);
    execute format('create trigger atlas_audit_%I after insert or update or delete on public.%I for each row execute function public.audit_row_change()', table_name, table_name);
  end loop;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles','organizations','organization_members','organization_settings','organization_modules',
    'customers','vendors','products','invoices','invoice_lines','payments','expense_categories',
    'expenses','chart_of_accounts','journal_entries','employees','documents'
  ] loop
    execute format('drop trigger if exists atlas_updated_%I on public.%I', table_name, table_name);
    execute format('create trigger atlas_updated_%I before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end;
$$;

create or replace function public.normalize_invoice_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  confirmed_total numeric;
begin
  select coalesce(sum(amount), 0)
    into confirmed_total
    from public.payments
   where invoice_id = new.id and status = 'confirmed';
  if new.status = 'cancelled' then
    new.balance_due := 0;
  else
    new.balance_due := greatest(coalesce(new.total, 0) - confirmed_total, 0);
    if coalesce(new.total, 0) > 0 and new.balance_due = 0 then
      new.status := 'paid';
    elsif new.status = 'paid' and new.balance_due > 0 then
      new.status := 'open';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists atlas_invoice_balance on public.invoices;
create trigger atlas_invoice_balance
before insert or update of total, status on public.invoices
for each row execute function public.normalize_invoice_balance();

create or replace function public.refresh_invoice_from_payments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_uuid uuid;
begin
  invoice_uuid := coalesce(new.invoice_id, old.invoice_id);
  update public.invoices
     set updated_at = now()
   where id = invoice_uuid;
  return coalesce(new, old);
end;
$$;

drop trigger if exists atlas_payment_refresh_invoice on public.payments;
create trigger atlas_payment_refresh_invoice
after insert or update or delete on public.payments
for each row execute function public.refresh_invoice_from_payments();

create or replace function public.refresh_invoice_from_lines()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_uuid uuid;
  line_total numeric;
  line_count integer;
begin
  invoice_uuid := coalesce(new.invoice_id, old.invoice_id);
  select count(*), coalesce(sum(quantity * unit_price * (1 + tax_rate / 100)), 0)
    into line_count, line_total
    from public.invoice_lines
   where invoice_id = invoice_uuid;
  if line_count > 0 then
    update public.invoices set total = round(line_total, 2), updated_at = now() where id = invoice_uuid;
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists atlas_line_refresh_invoice on public.invoice_lines;
create trigger atlas_line_refresh_invoice
after insert or update or delete on public.invoice_lines
for each row execute function public.refresh_invoice_from_lines();

create or replace function public.prevent_unbalanced_posting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'posted' and old.status is distinct from 'posted' and not public.validate_journal_entry(new.id) then
    raise exception 'Journal entry must be balanced before posting';
  end if;
  return new;
end;
$$;

drop trigger if exists atlas_validate_journal_posting on public.journal_entries;
create trigger atlas_validate_journal_posting
before update of status on public.journal_entries
for each row execute function public.prevent_unbalanced_posting();

create or replace function public.record_invoice_payment(
  invoice_uuid uuid,
  payment_amount numeric,
  paid_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_uuid uuid;
  outstanding numeric;
  payment_uuid uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if payment_amount <= 0 then raise exception 'Payment amount must be greater than zero'; end if;

  select org_id, balance_due into organization_uuid, outstanding
    from public.invoices where id = invoice_uuid for update;
  if organization_uuid is null then raise exception 'Invoice not found'; end if;
  if not public.can_write_accounting_data(organization_uuid) then raise exception 'Accounting role required'; end if;
  if payment_amount > outstanding then raise exception 'Payment exceeds outstanding balance'; end if;

  insert into public.payments(org_id, invoice_id, amount, payment_date, status, created_by)
  values(organization_uuid, invoice_uuid, payment_amount, coalesce(paid_on, current_date), 'confirmed', auth.uid())
  returning id into payment_uuid;
  return payment_uuid;
end;
$$;

create or replace function public.create_balanced_journal_entry(
  organization_uuid uuid,
  entry_code text,
  entry_on date,
  entry_memo text,
  debit_account_uuid uuid,
  credit_account_uuid uuid,
  entry_amount numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  journal_uuid uuid;
  valid_accounts integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not public.can_write_accounting_data(organization_uuid) then raise exception 'Accounting role required'; end if;
  if entry_amount <= 0 then raise exception 'Entry amount must be greater than zero'; end if;
  if debit_account_uuid = credit_account_uuid then raise exception 'Debit and credit accounts must differ'; end if;

  select count(*) into valid_accounts
    from public.chart_of_accounts
   where org_id = organization_uuid and id in (debit_account_uuid, credit_account_uuid);
  if valid_accounts <> 2 then raise exception 'Both accounts must belong to the active organization'; end if;

  insert into public.journal_entries(org_id, entry_number, entry_date, memo, status, created_by)
  values(organization_uuid, entry_code, coalesce(entry_on, current_date), entry_memo, 'draft', auth.uid())
  returning id into journal_uuid;

  insert into public.journal_lines(org_id, journal_entry_id, account_id, debit, credit)
  values
    (organization_uuid, journal_uuid, debit_account_uuid, entry_amount, 0),
    (organization_uuid, journal_uuid, credit_account_uuid, 0, entry_amount);

  update public.journal_entries set status = 'posted' where id = journal_uuid;
  return journal_uuid;
end;
$$;

grant execute on function public.record_invoice_payment(uuid, numeric, date) to authenticated;
grant execute on function public.create_balanced_journal_entry(uuid, text, date, text, uuid, uuid, numeric) to authenticated;

commit;

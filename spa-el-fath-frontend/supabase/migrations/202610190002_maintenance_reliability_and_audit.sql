-- Maintenance reliability fields are stored in the existing JSONB payload, so no destructive table rewrite is required.
-- This append-only audit log records row creation, updates, and deletion for key maintenance records.

create table if not exists public.audit_trail (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid null default auth.uid(),
  created_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

alter table public.audit_trail enable row level security;
revoke all on public.audit_trail from anon;
grant select on public.audit_trail to authenticated;

drop policy if exists audit_trail_read_leadership on public.audit_trail;
create policy audit_trail_read_leadership on public.audit_trail
for select to authenticated
using ((select private.current_role()) in ('admin', 'production_chief'));

create or replace function public.capture_audit_trail()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_row jsonb;
  new_row jsonb;
  target_id text;
begin
  if tg_op = 'INSERT' then
    old_row := null;
    new_row := to_jsonb(new);
    target_id := coalesce(new_row ->> 'id', 'unknown');
  elsif tg_op = 'UPDATE' then
    old_row := to_jsonb(old);
    new_row := to_jsonb(new);
    target_id := coalesce(new_row ->> 'id', old_row ->> 'id', 'unknown');
  else
    old_row := to_jsonb(old);
    new_row := null;
    target_id := coalesce(old_row ->> 'id', 'unknown');
  end if;

  -- Never duplicate image data into the audit log; keep metadata and other fields only.
  if tg_table_name = 'maintenance_logs' then
    if old_row is not null and old_row ? 'payload' then old_row := jsonb_set(old_row, '{payload}', (old_row -> 'payload') - 'noteImage', true); end if;
    if new_row is not null and new_row ? 'payload' then new_row := jsonb_set(new_row, '{payload}', (new_row -> 'payload') - 'noteImage', true); end if;
  end if;

  insert into public.audit_trail(table_name, record_id, action, actor_id, old_data, new_data)
  values (tg_table_name, target_id, tg_op, auth.uid(), old_row, new_row);

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.capture_audit_trail() from public;

drop trigger if exists audit_machines_changes on public.machines;
create trigger audit_machines_changes after insert or update or delete on public.machines
for each row execute function public.capture_audit_trail();

drop trigger if exists audit_workshops_changes on public.workshops;
create trigger audit_workshops_changes after insert or update or delete on public.workshops
for each row execute function public.capture_audit_trail();

drop trigger if exists audit_maintenance_logs_changes on public.maintenance_logs;
create trigger audit_maintenance_logs_changes after insert or update or delete on public.maintenance_logs
for each row execute function public.capture_audit_trail();

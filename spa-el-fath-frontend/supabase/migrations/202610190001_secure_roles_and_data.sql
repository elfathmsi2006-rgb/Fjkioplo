-- SPA EL FATH: Auth profiles, business tables, and server-enforced role policies.
-- Run this whole file in Supabase Dashboard > SQL Editor.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  role text not null default 'maintenance_worker'
    check (role in ('admin', 'production_chief', 'maintenance_worker', 'workshop_head')),
  workshop_id text null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.workshops (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.machines (
  id text primary key,
  workshop_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.maintenance_logs (
  id text primary key,
  machine_id text not null,
  workshop_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workshops drop constraint if exists workshops_payload_id_matches;
alter table public.workshops add constraint workshops_payload_id_matches check (payload ->> 'id' = id);
alter table public.machines drop constraint if exists machines_payload_scope_matches;
alter table public.machines add constraint machines_payload_scope_matches check (payload ->> 'id' = id and payload ->> 'workshopId' = workshop_id);
alter table public.maintenance_logs drop constraint if exists maintenance_logs_payload_id_matches;
alter table public.maintenance_logs add constraint maintenance_logs_payload_id_matches check (payload ->> 'id' = id and payload ->> 'machineId' = machine_id);

create index if not exists machines_workshop_id_idx on public.machines(workshop_id);
create index if not exists maintenance_logs_workshop_id_idx on public.maintenance_logs(workshop_id);
create index if not exists maintenance_logs_machine_id_idx on public.maintenance_logs(machine_id);

create or replace function private.current_role()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.active = true
  limit 1;
$$;

create or replace function private.current_workshop_id()
returns text
language sql stable security definer
set search_path = ''
as $$
  select p.workshop_id from public.profiles p
  where p.id = (select auth.uid()) and p.active = true
  limit 1;
$$;

create or replace function private.machine_in_workshop(p_machine_id text, p_workshop_id text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.machines m
    where m.id = p_machine_id and m.workshop_id = p_workshop_id
  );
$$;

revoke all on function private.current_role() from public, anon;
revoke all on function private.current_workshop_id() from public, anon;
revoke all on function private.machine_in_workshop(text, text) from public, anon;
grant execute on function private.current_role() to authenticated;
grant execute on function private.current_workshop_id() to authenticated;
grant execute on function private.machine_in_workshop(text, text) to authenticated;

-- Every new Auth user starts with the least-privileged role. Never accept role from user metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role, active)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'maintenance_worker',
    false
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

 drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

alter table public.profiles enable row level security;
alter table public.workshops enable row level security;
alter table public.machines enable row level security;
alter table public.maintenance_logs enable row level security;

revoke all on public.profiles, public.workshops, public.machines, public.maintenance_logs from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.workshops, public.machines, public.maintenance_logs to authenticated;

-- Profiles: users can read only their own profile; administrators can read all profiles.
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
for select to authenticated
using (id = (select auth.uid()) or (select private.current_role()) = 'admin');

-- Workshops: leadership sees all; other staff only see their assigned workshop.
drop policy if exists workshops_select_by_role on public.workshops;
create policy workshops_select_by_role on public.workshops
for select to authenticated
using (
  (select private.current_role()) in ('admin', 'production_chief')
  or id = (select private.current_workshop_id())
);
drop policy if exists workshops_insert_leadership on public.workshops;
create policy workshops_insert_leadership on public.workshops
for insert to authenticated
with check ((select private.current_role()) in ('admin', 'production_chief'));
drop policy if exists workshops_update_leadership_or_head on public.workshops;
create policy workshops_update_leadership_or_head on public.workshops
for update to authenticated
using (
  (select private.current_role()) in ('admin', 'production_chief')
  or ((select private.current_role()) = 'workshop_head' and id = (select private.current_workshop_id()))
)
with check (
  (select private.current_role()) in ('admin', 'production_chief')
  or ((select private.current_role()) = 'workshop_head' and id = (select private.current_workshop_id()))
);
drop policy if exists workshops_delete_leadership on public.workshops;
create policy workshops_delete_leadership on public.workshops
for delete to authenticated
using ((select private.current_role()) in ('admin', 'production_chief'));

-- Machines: maintenance workers and workshop heads are confined to their assigned workshop.
drop policy if exists machines_select_by_role on public.machines;
create policy machines_select_by_role on public.machines
for select to authenticated
using (
  (select private.current_role()) in ('admin', 'production_chief')
  or (
    (select private.current_role()) in ('maintenance_worker', 'workshop_head')
    and workshop_id = (select private.current_workshop_id())
  )
);
drop policy if exists machines_insert_by_role on public.machines;
create policy machines_insert_by_role on public.machines
for insert to authenticated
with check (
  (select private.current_role()) in ('admin', 'production_chief')
  or ((select private.current_role()) = 'workshop_head' and workshop_id = (select private.current_workshop_id()))
);
drop policy if exists machines_update_by_role on public.machines;
create policy machines_update_by_role on public.machines
for update to authenticated
using (
  (select private.current_role()) in ('admin', 'production_chief')
  or ((select private.current_role()) = 'workshop_head' and workshop_id = (select private.current_workshop_id()))
)
with check (
  (select private.current_role()) in ('admin', 'production_chief')
  or ((select private.current_role()) = 'workshop_head' and workshop_id = (select private.current_workshop_id()))
);
drop policy if exists machines_delete_leadership on public.machines;
create policy machines_delete_leadership on public.machines
for delete to authenticated
using ((select private.current_role()) in ('admin', 'production_chief'));

-- Maintenance records: all roles are scoped by role and workshop. Only leadership can delete.
drop policy if exists maintenance_logs_select_by_role on public.maintenance_logs;
create policy maintenance_logs_select_by_role on public.maintenance_logs
for select to authenticated
using (
  (select private.current_role()) in ('admin', 'production_chief')
  or (
    (select private.current_role()) in ('maintenance_worker', 'workshop_head')
    and workshop_id = (select private.current_workshop_id())
  )
);
drop policy if exists maintenance_logs_insert_by_role on public.maintenance_logs;
create policy maintenance_logs_insert_by_role on public.maintenance_logs
for insert to authenticated
with check (
  (select private.current_role()) in ('admin', 'production_chief')
  or (
    (select private.current_role()) in ('maintenance_worker', 'workshop_head')
    and workshop_id = (select private.current_workshop_id())
    and (select private.machine_in_workshop(machine_id, workshop_id))
  )
);
drop policy if exists maintenance_logs_update_by_role on public.maintenance_logs;
create policy maintenance_logs_update_by_role on public.maintenance_logs
for update to authenticated
using (
  (select private.current_role()) in ('admin', 'production_chief')
  or (
    (select private.current_role()) in ('maintenance_worker', 'workshop_head')
    and workshop_id = (select private.current_workshop_id())
    and (select private.machine_in_workshop(machine_id, workshop_id))
  )
)
with check (
  (select private.current_role()) in ('admin', 'production_chief')
  or (
    (select private.current_role()) in ('maintenance_worker', 'workshop_head')
    and workshop_id = (select private.current_workshop_id())
    and (select private.machine_in_workshop(machine_id, workshop_id))
  )
);
drop policy if exists maintenance_logs_delete_leadership on public.maintenance_logs;
create policy maintenance_logs_delete_leadership on public.maintenance_logs
for delete to authenticated
using ((select private.current_role()) in ('admin', 'production_chief'));

-- Existing localStorage data is intentionally NOT copied automatically into the database.
-- Import it through the app while signed in as an administrator, after creating workshops first.

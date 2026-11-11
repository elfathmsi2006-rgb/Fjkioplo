-- SPA EL FATH CMMS foundation. Additive only: does not replace existing application tables.
-- Run after 202610190001 and 202610190002 in Supabase SQL Editor.

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  machine_id text not null,
  workshop_id text,
  title text not null,
  description text not null default '',
  fault_code text,
  symptoms text not null default '',
  root_cause text,
  corrective_action text,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'reported' check (status in ('reported','triaged','assigned','in_progress','diagnosis','awaiting_parts','awaiting_approval','testing','completed','cancelled')),
  reported_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  discovered_at timestamptz not null default now(),
  repair_started_at timestamptz,
  repair_ended_at timestamptz,
  returned_to_service_at timestamptz,
  downtime_minutes integer check (downtime_minutes is null or downtime_minutes >= 0),
  labor_minutes integer check (labor_minutes is null or labor_minutes >= 0),
  parts_cost numeric(14,2) not null default 0 check (parts_cost >= 0),
  labor_cost numeric(14,2) not null default 0 check (labor_cost >= 0),
  safety_check_passed boolean not null default false,
  repair_test_result text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint work_order_machine_id_not_empty check (length(trim(machine_id)) > 0),
  constraint work_order_close_requires_approval check (status <> 'completed' or (approved_at is not null and repair_test_result is not null))
);
create index if not exists work_orders_status_priority_idx on public.work_orders(status, priority, due_at);
create index if not exists work_orders_machine_created_idx on public.work_orders(machine_id, created_at desc);
create index if not exists work_orders_workshop_status_idx on public.work_orders(workshop_id, status);

create table if not exists public.preventive_maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null unique,
  machine_id text not null,
  title text not null,
  frequency text not null check (frequency in ('daily','weekly','monthly','quarterly','yearly','operating_hours')),
  interval_value integer not null default 1 check (interval_value > 0),
  next_due_at timestamptz not null,
  last_completed_at timestamptz,
  checklist jsonb not null default '[]'::jsonb,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes >= 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists preventive_plans_due_idx on public.preventive_maintenance_plans(active, next_due_at);
create index if not exists preventive_plans_machine_idx on public.preventive_maintenance_plans(machine_id);

create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  part_code text not null unique,
  name text not null,
  description text not null default '',
  quantity_on_hand numeric(14,3) not null default 0 check (quantity_on_hand >= 0),
  minimum_quantity numeric(14,3) not null default 0 check (minimum_quantity >= 0),
  unit text not null default 'unit',
  storage_location text not null default '',
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  supplier_name text,
  lead_time_days integer check (lead_time_days is null or lead_time_days >= 0),
  compatible_machine_codes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists spare_parts_low_stock_idx on public.spare_parts(quantity_on_hand, minimum_quantity);

create table if not exists public.spare_part_transactions (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.spare_parts(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete set null,
  transaction_type text not null check (transaction_type in ('receipt','issue','return','adjustment','reservation','release')),
  quantity numeric(14,3) not null check (quantity > 0),
  unit_cost numeric(14,2) not null default 0 check (unit_cost >= 0),
  performed_by uuid references auth.users(id) on delete set null,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists part_transactions_part_date_idx on public.spare_part_transactions(part_id, created_at desc);

create table if not exists public.technician_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  specialties text[] not null default '{}',
  skills jsonb not null default '[]'::jsonb,
  shift_start time,
  shift_end time,
  available boolean not null default true,
  hourly_cost numeric(14,2) check (hourly_cost is null or hourly_cost >= 0),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.safety_inspections (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  work_order_id uuid references public.work_orders(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,
  result text not null check (result in ('passed','failed','conditional')),
  hazards jsonb not null default '[]'::jsonb,
  loto_confirmed boolean not null default false,
  inspector_id uuid references auth.users(id) on delete set null,
  inspected_at timestamptz not null default now(),
  notes text not null default '',
  constraint failed_safety_requires_hazard_note check (result <> 'failed' or jsonb_array_length(hazards) > 0)
);
create index if not exists safety_inspections_machine_date_idx on public.safety_inspections(machine_id, inspected_at desc);

create table if not exists public.machine_documents (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  workshop_id text,
  title text not null,
  document_type text not null check (document_type in ('manual','electrical_diagram','mechanical_diagram','certificate','photo','other')),
  storage_path text not null,
  version_label text not null default '1',
  issued_at date,
  expires_at date,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists machine_documents_machine_idx on public.machine_documents(machine_id, created_at desc);

create table if not exists public.production_downtime_events (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  workshop_id text,
  production_line text,
  work_order_id uuid references public.work_orders(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  planned boolean not null default false,
  cause_category text not null default 'unknown',
  production_target numeric(14,3),
  production_actual numeric(14,3),
  good_units numeric(14,3),
  total_units numeric(14,3),
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint downtime_end_after_start check (ended_at is null or ended_at >= started_at)
);
create index if not exists downtime_machine_started_idx on public.production_downtime_events(machine_id, started_at desc);
create index if not exists downtime_workshop_started_idx on public.production_downtime_events(workshop_id, started_at desc);

-- Keep audit history append-only for the new operational records.
create or replace function public.audit_cmms_row()
returns trigger language plpgsql security definer set search_path = public as $$
declare old_row jsonb; new_row jsonb; target_id text;
begin
  if tg_op = 'INSERT' then old_row := null; new_row := to_jsonb(new); target_id := coalesce(new_row ->> 'id', 'unknown');
  elsif tg_op = 'UPDATE' then old_row := to_jsonb(old); new_row := to_jsonb(new); target_id := coalesce(new_row ->> 'id', old_row ->> 'id', 'unknown');
  else old_row := to_jsonb(old); new_row := null; target_id := coalesce(old_row ->> 'id', 'unknown'); end if;
  insert into public.audit_trail(table_name, record_id, action, actor_id, old_data, new_data)
  values (tg_table_name, target_id, tg_op, auth.uid(), old_row, new_row);
  if tg_op = 'DELETE' then return old; end if; return new;
end; $$;
revoke all on function public.audit_cmms_row() from public;

do $$ declare tbl text; begin
  foreach tbl in array array['work_orders','preventive_maintenance_plans','spare_parts','spare_part_transactions','technician_profiles','safety_inspections','machine_documents','production_downtime_events'] loop
    execute format('drop trigger if exists audit_%I_changes on public.%I', tbl, tbl);
    execute format('create trigger audit_%I_changes after insert or update or delete on public.%I for each row execute function public.audit_cmms_row()', tbl, tbl);
  end loop;
end $$;

-- Fail closed until role-specific policies are configured: authenticated users can read operational data;
-- only admins/production leadership can change configuration, and work orders can be reported by signed-in users.
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['work_orders','preventive_maintenance_plans','spare_parts','spare_part_transactions','technician_profiles','safety_inspections','machine_documents','production_downtime_events'] LOOP
    EXECUTE format('alter table public.%I enable row level security', tbl);
    EXECUTE format('revoke all on public.%I from anon', tbl);
    EXECUTE format('grant select on public.%I to authenticated', tbl);
    EXECUTE format('grant insert, update on public.%I to authenticated', tbl);
  END LOOP;
END $$;

drop policy if exists work_orders_read_authenticated on public.work_orders;
create policy work_orders_read_authenticated on public.work_orders for select to authenticated using (true);
drop policy if exists work_orders_report_authenticated on public.work_orders;
create policy work_orders_report_authenticated on public.work_orders for insert to authenticated with check (reported_by = auth.uid() or (select private.current_role()) in ('admin','production_chief','workshop_head'));
drop policy if exists work_orders_update_leadership on public.work_orders;
create policy work_orders_update_leadership on public.work_orders for update to authenticated using ((select private.current_role()) in ('admin','production_chief','workshop_head','maintenance_worker')) with check ((select private.current_role()) in ('admin','production_chief','workshop_head','maintenance_worker'));

do $$ declare tbl text; begin
  foreach tbl in array array['preventive_maintenance_plans','spare_parts','spare_part_transactions','technician_profiles','safety_inspections','machine_documents','production_downtime_events'] loop
    execute format('drop policy if exists %I on public.%I', tbl || '_leadership_manage', tbl);
    execute format('create policy %I on public.%I for all to authenticated using ((select private.current_role()) in (''admin'',''production_chief'')) with check ((select private.current_role()) in (''admin'',''production_chief''))', tbl || '_leadership_manage', tbl);
  end loop;
END $$;

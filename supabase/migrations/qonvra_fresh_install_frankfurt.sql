-- Qonvra CRM — consolidated fresh-install schema for the new Frankfurt
-- (eu-central-1) project. Equivalent end state to migrations 0001-0008 run
-- in order, but written directly against a fresh empty database instead of
-- replaying that incremental history — e.g. user_role includes 'showroom'
-- from creation rather than via a later `alter type ... add value`, and
-- policies are created in their final form rather than created-then-altered.
-- Run this once, in full, in the new project's SQL Editor.

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('agent', 'team_leader', 'admin', 'showroom');
create type appt_status as enum
  ('scheduled','confirmed','attended','no_show','rescheduled','cancelled','closed_sold');
create type appt_source as enum ('phone_call','whatsapp','other');

-- ============================================================
-- TABLES
-- ============================================================

-- accounts / profiles (1:1 with auth.users)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  username     text unique not null,
  role         user_role not null default 'agent',
  status       text not null default 'active',        -- 'active' | 'suspended' | 'removed'
  agent_code   text unique,                            -- e.g. 'RAW' for appt id prefixes
  created_at   timestamptz not null default now()
);

-- branches (multi-branch ready: Nablus, Ramallah, ...)
create table branches (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null
);

-- showroom "handled by" tracking: a lightweight, admin-managed name list
-- (not login accounts) for who on the ground actually took care of a
-- customer — distinct from assigned_agent, the call-center agent who booked
-- the appointment over the phone.
create table handlers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- the ONE appointments table
create table appointments (
  id             uuid primary key default gen_random_uuid(),
  appt_code      text unique not null,                 -- human id, e.g. 'RAW-0012'
  customer_name  text not null,
  phone          text,
  assigned_agent uuid not null references profiles(id),
  branch_id      uuid references branches(id),
  source         appt_source not null default 'phone_call',
  appt_date      date not null,
  appt_time      time,
  status         appt_status not null default 'scheduled',
  sale_amount    numeric(12,2),
  notes          text,
  created_by     uuid references profiles(id),         -- audit
  created_at     timestamptz not null default now(),
  updated_by     uuid references profiles(id),         -- audit
  updated_at     timestamptz not null default now(),
  rescheduled_from uuid references appointments(id),
  handled_by     uuid references handlers(id)
);

create index on appointments (assigned_agent);
create index on appointments (appt_date);
create index on appointments (status);
create index on appointments (rescheduled_from);
create index on appointments (handled_by);

-- status-change audit trail
create table appt_history (
  id           uuid primary key default gen_random_uuid(),
  appt_id      uuid references appointments(id) on delete cascade,
  changed_by   uuid references profiles(id),
  old_status   appt_status,
  new_status   appt_status,
  changed_at   timestamptz not null default now()
);

-- threaded comments on appointments: immutable log, no update/delete.
create table appt_comments (
  id         uuid primary key default gen_random_uuid(),
  appt_id    uuid not null references appointments(id) on delete cascade,
  author_id  uuid not null default auth.uid() references profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);

create index on appt_comments (appt_id);

-- ============================================================
-- RLS
-- ============================================================
alter table profiles      enable row level security;
alter table branches      enable row level security;
alter table appointments  enable row level security;
alter table appt_history  enable row level security;
alter table handlers      enable row level security;
alter table appt_comments enable row level security;

-- helper: current user's role.
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $fn_auth_role$
  select role from profiles where id = auth.uid()
$fn_auth_role$;

-- profiles: users read their own; team leaders and showroom read all; admins read/write all
create policy "profiles self read"    on profiles for select using (id = auth.uid());
create policy "profiles leader read"  on profiles for select using (auth_role() = 'team_leader');
create policy "profiles showroom read" on profiles for select using (auth_role() = 'showroom');
create policy "profiles admin all"    on profiles for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- branches: any signed-in user can read; only admins manage them
create policy "branches read all" on branches for select using (auth.uid() is not null);
create policy "branches admin write" on branches for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- appointments: agents see only their own; team_leaders/admins/showroom see all
create policy "appt read" on appointments for select using (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom')
);
create policy "appt insert" on appointments for insert with check (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom')
);
create policy "appt update" on appointments for update using (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom')
);
create policy "appt delete" on appointments for delete using (auth_role() = 'admin');

-- appt_history: readable/insertable by whoever can see/update the parent appointment
create policy "history read" on appt_history for select using (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);
create policy "history insert own" on appt_history for insert with check (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);

-- handlers
create policy "handlers read all" on handlers for select using (auth.uid() is not null);
create policy "handlers admin write" on handlers for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- comments
create policy "comments read" on appt_comments for select using (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);
create policy "comments insert" on appt_comments for insert with check (
  author_id = auth.uid() and exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table appointments;

-- ============================================================
-- FUNCTIONS / TRIGGERS
-- ============================================================

-- appt_code generation: <AGENT_CODE>-<0000>, sequential per agent.
-- Preserves an explicitly-provided appt_code (used by CSV imports).
create or replace function generate_appt_code() returns trigger
language plpgsql as $fn_appt_code$
declare
  v_agent_code text;
  v_next int;
begin
  if new.appt_code is not null and new.appt_code <> '' then
    return new;
  end if;

  select agent_code into v_agent_code from profiles where id = new.assigned_agent;
  if v_agent_code is null then
    raise exception 'assigned_agent % has no agent_code set', new.assigned_agent;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_agent_code));

  select coalesce(max(
    nullif(regexp_replace(appt_code, '^' || v_agent_code || '-', ''), '')::int
  ), 0) + 1
  into v_next
  from appointments
  where appt_code like v_agent_code || '-%';

  new.appt_code := v_agent_code || '-' || lpad(v_next::text, 4, '0');
  return new;
end;
$fn_appt_code$;

create trigger trg_generate_appt_code
  before insert on appointments
  for each row execute function generate_appt_code();

-- status-change audit trail + updated_by/updated_at stamping
create or replace function log_appt_status_change() returns trigger
language plpgsql as $fn_status_history$
begin
  if new.status is distinct from old.status then
    insert into appt_history (appt_id, changed_by, old_status, new_status)
    values (new.id, auth.uid(), old.status, new.status);
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$fn_status_history$;

create trigger trg_appt_status_history
  before update on appointments
  for each row execute function log_appt_status_change();

-- reschedule: freeze the original as 'rescheduled', create a new linked appointment
create or replace function reschedule_appointment(
  p_old_id uuid,
  p_new_date date,
  p_new_time time
) returns appointments
language plpgsql
as $resched$
declare
  v_old appointments;
  v_new appointments;
begin
  select * into v_old from appointments where id = p_old_id;
  if not found then
    raise exception 'Appointment % not found or not accessible', p_old_id;
  end if;

  update appointments
  set status = 'rescheduled'
  where id = p_old_id;

  insert into appointments (
    customer_name, phone, assigned_agent, branch_id, source,
    appt_date, appt_time, status, created_by, rescheduled_from
  ) values (
    v_old.customer_name, v_old.phone, v_old.assigned_agent, v_old.branch_id, v_old.source,
    p_new_date, p_new_time, 'scheduled', auth.uid(), p_old_id
  )
  returning * into v_new;

  return v_new;
end;
$resched$;

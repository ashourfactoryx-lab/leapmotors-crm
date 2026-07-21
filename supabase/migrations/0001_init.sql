-- LeapMotor CRM — initial schema, RLS, and triggers.
-- Run this once in the Supabase SQL Editor (or `supabase db push`).

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('agent', 'team_leader', 'admin');
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
  status       text not null default 'active',        -- 'active' | 'suspended'
  agent_code   text unique,                            -- e.g. 'RAW' for appt id prefixes
  created_at   timestamptz not null default now()
);

-- branches (multi-branch ready: Nablus, Ramallah, ...)
create table branches (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null
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
  updated_at     timestamptz not null default now()
);

create index on appointments (assigned_agent);
create index on appointments (appt_date);
create index on appointments (status);

-- status-change audit trail
create table appt_history (
  id           uuid primary key default gen_random_uuid(),
  appt_id      uuid references appointments(id) on delete cascade,
  changed_by   uuid references profiles(id),
  old_status   appt_status,
  new_status   appt_status,
  changed_at   timestamptz not null default now()
);

-- ============================================================
-- RLS
-- ============================================================
alter table profiles     enable row level security;
alter table branches     enable row level security;
alter table appointments enable row level security;
alter table appt_history enable row level security;

-- helper: current user's role.
-- security definer + a locked search_path so this bypasses profiles' own RLS
-- when it reads the caller's role — otherwise the "profiles admin all" policy
-- (which itself calls auth_role()) recurses into profiles' RLS forever and
-- Postgres aborts with "stack depth limit exceeded".
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $fn_auth_role$
  select role from profiles where id = auth.uid()
$fn_auth_role$;

-- profiles: users read their own; admins read/write all
create policy "profiles self read"  on profiles for select using (id = auth.uid());
create policy "profiles admin all"  on profiles for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- branches: any signed-in user can read; only admins manage them
create policy "branches read all" on branches for select using (auth.uid() is not null);
create policy "branches admin write" on branches for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- appointments:
-- agents see only their own; team_leaders & admins see all
create policy "appt read" on appointments for select using (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin')
);
-- agents can insert their own; leaders/admins can insert any
create policy "appt insert" on appointments for insert with check (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin')
);
-- agents update only their own rows; leaders/admins update any
create policy "appt update" on appointments for update using (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin')
);
-- deletes: admins only (suspend/soft rules handled in app)
create policy "appt delete" on appointments for delete using (auth_role() = 'admin');

-- appt_history: readable/insertable by whoever can see/update the parent appointment
create policy "history read" on appt_history for select using (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin'))
  )
);
create policy "history insert own" on appt_history for insert with check (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin'))
  )
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- appt_code generation: <AGENT_CODE>-<0000>, sequential per agent.
-- Preserves an explicitly-provided appt_code (used by the CSV seed import).
-- An advisory lock keyed on the agent code prevents duplicate codes when two
-- inserts for the same agent race each other.
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

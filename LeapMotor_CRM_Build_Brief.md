# LeapMotor — Appointment CRM · Build Brief

> Hand this whole file to Claude Code. It is the source of truth for the project.
> Build in the milestone order at the bottom. Ask me before making schema changes
> that aren't described here.

---

## 1. What we're building

An internal web app for a **LeapMotor car dealership call-center team** (~44 agents)
to book, track, and follow up on showroom appointments. It replaces a fragile Excel
workbook that used **one sheet per agent** — impossible to secure, report on, or scale.

Core goals:
- Every agent signs in and sees **only their own appointments**.
- The **admin** creates and manages all accounts. Employees can **only log in** — no self-registration.
- A shared **Daily Schedule** the team uses to walk through the day and update each status live.
- A **printable daily schedule** (print / save as PDF / share to WhatsApp).
- A live **dashboard** with KPIs and per-agent performance.
- One **single appointments table** as the source of truth (NOT one table per agent).

A working front-end prototype already exists (single HTML file) that proves the whole
UX and every permission rule. This brief turns it into a real product.

> **Visual reference:** a prototype is included as `LeapMotor_Appointments_Demo.html` — open
> it in a browser to see the intended UX and styling (login, spreadsheet "My Sheet", daily
> schedule, admin panel, dashboard). It is a throwaway mockup (data is hard-coded, no backend);
> use it **only** to match the look and feel, **not** as code to build on.

---

## 2. Tech stack (fixed)

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS
- **Backend / DB / Auth:** Supabase (Postgres + Supabase Auth + Row-Level Security + Realtime)
- **Hosting:** Vercel
- **PDF/print:** browser print with a dedicated print stylesheet (no heavy PDF lib needed for v1)
- **Data access:** Supabase JS client; server components/route handlers for privileged reads

Do not introduce other databases, ORMs, or auth providers.

---

## 3. Roles & permissions

Three roles. Login only — accounts are created by the admin.

| Capability                          | Agent | Team Leader | Admin |
|-------------------------------------|:-----:|:-----------:|:-----:|
| Sign in                             |  ✅   |     ✅      |  ✅   |
| See **own** appointments (sheet)    |  ✅   |     ✅      |  ✅   |
| See **all** appointments            |  ❌   |     ✅      |  ✅   |
| Book / create appointment           |  ✅   |     ✅      |  ✅   |
| Edit **own** appt status & notes    |  ✅   |     ✅      |  ✅   |
| Edit **any** appt status            |  ❌   |     ✅      |  ✅   |
| Daily Schedule (view + update)      |  ✅   |     ✅      |  ✅   |
| Print daily schedule                |  ✅   |     ✅      |  ✅   |
| Dashboard                           |  ✅   |     ✅      |  ✅   |
| Reports                             |  ❌   |     ✅      |  ✅   |
| Create / edit / suspend / remove accounts | ❌ | ❌       |  ✅   |
| Reset another user's password       |  ❌   |     ❌      |  ✅   |

**Critical:** access control must be enforced in the **database with RLS**, not only in the UI.
An agent must be unable to read another agent's rows even via direct API calls.

---

## 4. Data model (Postgres)

Single source of truth. Run this as the initial migration, then refine.

```sql
-- enums
create type user_role as enum ('agent', 'team_leader', 'admin');
create type appt_status as enum
  ('scheduled','confirmed','attended','no_show','rescheduled','cancelled','closed_sold');
create type appt_source as enum ('phone_call','whatsapp','other');

-- accounts / profiles (1:1 with auth.users)
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null,
  username     text unique not null,
  role         user_role not null default 'agent',
  status       text not null default 'active',        -- 'active' | 'suspended'
  agent_code   text unique,                           -- e.g. 'RAW' for appt id prefixes
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
  appt_code      text unique not null,                -- human id, e.g. 'RAW-0012'
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
  created_by     uuid references profiles(id),        -- audit
  created_at     timestamptz not null default now(),
  updated_by     uuid references profiles(id),        -- audit
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
```

### RLS policies (enable RLS on every table)

```sql
alter table profiles     enable row level security;
alter table appointments enable row level security;
alter table appt_history enable row level security;

-- helper: current user's role
create or replace function auth_role() returns user_role
language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

-- profiles: users read their own; admins read/write all
create policy "profiles self read"  on profiles for select using (id = auth.uid());
create policy "profiles admin all"  on profiles for all
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
```

Add a trigger to write `appt_history` and stamp `updated_by/updated_at` on status change.

### appt_code generation
Format `<AGENT_CODE>-<0000>` (e.g. `RAW-0012`), sequential per agent. Generate in a
Postgres function/trigger on insert so codes are always unique and gap-tolerant.

---

## 5. Account management (admin)

- Admin creates an account = create the `auth.users` record (email + password) **via a secure
  server route using the Supabase service-role key** (never expose that key to the browser),
  then insert the matching `profiles` row (full_name, username, role, agent_code).
- Login uses **username** → map username→email server-side, or store username as the email
  local-part. Keep it simple: usernames are unique; sign in by username + password.
- **Reset password:** admin triggers a server route that sets a new password and returns it once
  to display to the admin (as the prototype does).
- **Suspend:** set `profiles.status='suspended'`; block sign-in for suspended users (check in a
  middleware / server action). Removing an account deletes the login but keeps their appointments.
- No public sign-up route may exist.

---

## 6. Screens / routes

| Route              | Who            | Purpose |
|--------------------|----------------|---------|
| `/login`           | everyone       | Username + password only. No sign-up link. |
| `/` (dashboard)    | all logged in  | KPIs (total, attended, no-shows, sold, attendance %, conversion %), agent leaderboard, status breakdown. |
| `/my` (My Sheet)   | agent, +others | **Spreadsheet-style grid** of the user's own appointments (see §7). |
| `/book`            | agent, leader, admin | Create appointment form (auto appt_code). |
| `/schedule`        | all            | **Daily Schedule**: date picker (today default), sort by time / by agent, status filter, live inline status editing, **Print schedule** button. |
| `/appointments`    | leader, admin  | All appointments, **search** by customer / phone / appt_code, filter by agent, server-side paginated. |
| `/admin`           | admin          | Account table + create/reset/suspend/remove. |
| `/reports`         | leader, admin  | Appointments by day/month, agent performance, sales, attendance, no-show, source performance. |

Realtime: the Daily Schedule and Dashboard should live-update via Supabase Realtime when
statuses change, so the team sees each other's updates without refreshing.

---

## 7. Design system (match the prototype)

Modern, precise, EV-tech feel. Monochrome graphite + a single electric-teal accent.

**Colors**
- ink `#14161B` · graphite `#20242D` (dark surfaces, sidebar, login)
- paper `#EDEEF1` (app background) · card `#FFFFFF` · line `#E1E3E8`
- text `#171A20` · muted `#6A7280`
- **accent (electric teal)** `#0BD1A0`, deep `#06A57E`, soft `#E4FBF4`
- status colors: scheduled `#8A94A3`, confirmed `#3B7BF6`, attended `#0BD1A0`,
  no_show `#F0524B`, rescheduled `#8A6BF0`, cancelled `#B8BEC8`, closed_sold `#C79A3B`

**Type**
- Display/headings: **Space Grotesk** (600)
- UI/body: **Inter**
- Data / numbers / IDs / times: **JetBrains Mono** (tabular)

**Logo**
- Use the provided crisp mark assets: `leapmotor-mark-white.png` (dark bg),
  `leapmotor-mark-dark.png` (light bg). Pair with the wordmark "LEAPMOTOR" set in
  Space Grotesk, uppercase, letter-spacing ~0.2em. Never stretch the mark.

**Layout**
- Dark left sidebar (nav + logo + user chip + sign out); light content area with a sticky top bar
  showing the current view, an "N online" presence chip, and today's date.
- Mobile: sidebar collapses to a bottom tab bar; tables scroll horizontally.

**My Sheet must look like a spreadsheet (Excel / Google Sheets):**
- column-letter header row (A, B, C…), row-number gutter, visible gridlines, frozen header,
  a bottom sheet-tab showing the agent's name.
- Columns: Appt ID · Date · Time · Customer · Phone · Source · Branch · **Status** · **Sale** · **Notes**.
- **Status, Sale, Notes are editable inline** and save on change (optimistic update + write to DB);
  other cells read-only. Status cell shows the status color; edited cells never trigger a full reload.

---

## 8. Key behaviors

- Inline edits save instantly (optimistic UI, then persist; roll back on error).
- Daily printable schedule respects the current date, sort, and status filter; branded header with
  logo + "Today's Appointments" + long date; groups by agent when "by agent" sort is active.
- Online presence: show count of currently-signed-in agents (Supabase Realtime presence).
- All money/counts on the dashboard are computed from real rows — never hard-coded.
- Validate on entry: phone format, required customer name, valid date/time.

---

## 9. Data migration

A cleaned export of the existing June data is provided: **`appointments_seed.csv`**
(709 rows; columns: appt_id, customer_name, phone, assigned_agent, source, appt_date,
appt_time, branch, status, sale_amount, notes, booked_on).

Steps:
1. Create the four seed agents referenced in the file (Haya, Rawand, Eman, Su'ad) as `profiles`
   with agent_codes HAY/RAW/EMA/SUA, plus one admin and one team_leader account.
2. Map `assigned_agent` (name) → the corresponding profile id.
3. Map status text → the `appt_status` enum; map source → `appt_source` enum.
4. Insert branches as needed (default "Main Showroom").
5. Import rows; keep the existing `appt_code` values.
Provide this as a repeatable SQL/TS seed script.

---

## 10. Environment & secrets

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — client
- `SUPABASE_SERVICE_ROLE_KEY` — **server only**, used for admin account creation / password resets.
  Never import it into a client component.
- Vercel: set the same env vars in project settings.

---

## 11. Build order (milestones)

1. **Foundation** — Next.js + Tailwind scaffold, Supabase project wired, design tokens/fonts,
   base layout (sidebar + top bar), logo assets.
2. **DB + auth** — run the schema + RLS + triggers; username/password login; role-aware routing;
   suspend/active enforcement. Seed the migration data.
3. **Admin panel** — account CRUD via secure server routes (create, reset password, suspend, remove).
4. **My Sheet** — the spreadsheet grid with inline editing (status/sale/notes) saving to DB.
5. **Daily Schedule** — date nav, sort (time/agent), status filter, live inline status edits,
   Realtime sync, **Print schedule**.
6. **Dashboard** — KPIs, agent leaderboard, status breakdown (all from live queries).
7. **All Appointments** — search + agent filter + server-side pagination.
8. **Reports** — the report set in §6.
9. **Polish & deploy** — empty/error/loading states, mobile passes, deploy to Vercel.

After each milestone: verify RLS by signing in as an agent and confirming another agent's
rows are unreachable. Do not move on with console/type errors.

---

## 12. Definition of done

- An agent can only ever read/write their own appointments (verified at the DB level).
- Admin can fully manage accounts; employees cannot self-register.
- Statuses update live across users; the daily schedule prints cleanly.
- Dashboard numbers reconcile with the underlying rows.
- Deployed on Vercel, accessible on phone and desktop, no console errors.

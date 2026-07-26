-- Threaded comments on appointments: who said what, when — visible/insertable
-- by anyone who can already see/update the parent appointment, the same rule
-- appt_history already uses for its own read/insert policies. Immutable log,
-- no update/delete: comments are a record, not editable notes.
create table appt_comments (
  id         uuid primary key default gen_random_uuid(),
  appt_id    uuid not null references appointments(id) on delete cascade,
  author_id  uuid not null default auth.uid() references profiles(id),
  body       text not null,
  created_at timestamptz not null default now()
);

create index on appt_comments (appt_id);

alter table appt_comments enable row level security;

create policy "comments read" on appt_comments for select using (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin'))
  )
);
create policy "comments insert" on appt_comments for insert with check (
  author_id = auth.uid() and exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin'))
  )
);

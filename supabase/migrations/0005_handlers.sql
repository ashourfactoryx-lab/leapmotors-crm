-- Showroom "handled by" tracking: a lightweight, admin-managed name list
-- (not login accounts) for who on the ground actually took care of a
-- customer — distinct from assigned_agent, the call-center agent who booked
-- the appointment over the phone.
create table handlers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table appointments add column handled_by uuid references handlers(id);
create index on appointments (handled_by);

alter table handlers enable row level security;

create policy "handlers read all" on handlers for select using (auth.uid() is not null);
create policy "handlers admin write" on handlers for all
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

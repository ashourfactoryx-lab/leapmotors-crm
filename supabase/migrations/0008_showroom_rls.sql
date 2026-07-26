-- Grant the new 'showroom' role the same appointment-level access as
-- team_leader/admin: see every agent's appointments, update status/handled
-- by, and read/post comments — plus read-all on profiles (needed for the
-- agent-name filters/labels on Dashboard, Reports, and All Appointments).
alter policy "appt read" on appointments using (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom')
);
alter policy "appt insert" on appointments with check (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom')
);
alter policy "appt update" on appointments using (
  assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom')
);

alter policy "history read" on appt_history using (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);
alter policy "history insert own" on appt_history with check (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);

alter policy "comments read" on appt_comments using (
  exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);
alter policy "comments insert" on appt_comments with check (
  author_id = auth.uid() and exists (
    select 1 from appointments a where a.id = appt_id
    and (a.assigned_agent = auth.uid() or auth_role() in ('team_leader','admin','showroom'))
  )
);

create policy "profiles showroom read" on profiles for select using (auth_role() = 'showroom');

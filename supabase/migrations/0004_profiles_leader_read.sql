-- Team leaders can see all appointments (per "appt read"/"appt insert" policies)
-- but couldn't read other agents' profiles, so the Book Appointment form's
-- agent-assignment dropdown silently returned only the leader's own row.
create policy "profiles leader read" on profiles for select using (
  auth_role() = 'team_leader'
);

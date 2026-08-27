-- Allow team leaders (not just admins) to delete appointments — needed for
-- cleaning up test/mistake entries from the All Appointments page and My
-- Sheet without requiring an admin every time.
alter policy "appt delete" on appointments using (
  auth_role() in ('admin', 'team_leader')
);

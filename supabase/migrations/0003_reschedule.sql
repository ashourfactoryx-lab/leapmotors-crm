-- Rescheduling: keep the original appointment as a frozen historical record
-- (status='rescheduled') and create a new linked appointment for the new
-- date/time, rather than silently overwriting the old date/time in place.

alter table appointments add column rescheduled_from uuid references appointments(id);
create index on appointments (rescheduled_from);

-- security invoker (default) — runs as the calling user, so the existing
-- "appt read"/"appt update"/"appt insert" RLS policies are what actually
-- gate who can reschedule what; no extra permission checks needed here.
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

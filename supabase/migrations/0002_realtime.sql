-- Enables live Postgres change events for the Daily Schedule view.
-- (Presence — the "N online" chip — needs no table replication; it's a
-- separate in-memory broadcast channel.)
alter publication supabase_realtime add table appointments;

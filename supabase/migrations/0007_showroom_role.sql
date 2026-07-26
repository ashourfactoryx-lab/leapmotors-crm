-- New login role for the showroom: full read/comment/status access across
-- every agent's appointments (same operational scope as team_leader), but
-- without account-management access. Split into its own migration because
-- Postgres won't let a new enum value be referenced in the same transaction
-- that adds it — 0008 depends on this having already committed.
alter type user_role add value 'showroom';

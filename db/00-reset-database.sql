-- Optional: wipe niytri_crm and start over (then run 01, 02, 03)
-- pgAdmin: Query Tool on the "postgres" database, as root_admin -> run (F5)
-- WITH (FORCE) disconnects any open sessions (e.g. other pgAdmin tabs) first. PostgreSQL 13+.

DROP DATABASE IF EXISTS niytri_crm WITH (FORCE);

-- Step 3: Verify the load
-- pgAdmin: Query Tool on the "niytri_crm" database, as root_admin -> run (F5)
-- Expected: tables = 21

SELECT
  (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS tables,
  (SELECT count(*) FROM users)   AS users,
  (SELECT count(*) FROM clients) AS clients,
  (SELECT tableowner FROM pg_tables WHERE tablename = 'users') AS owner;

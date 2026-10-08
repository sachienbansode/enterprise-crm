-- Step 1: Create the NIYTRI CRM database
-- pgAdmin: connect as root_admin -> open Query Tool on the "postgres" database -> run (F5)
-- CREATE DATABASE cannot run inside a transaction; keep pgAdmin auto-commit ON (default).

CREATE DATABASE niytri_crm
  OWNER root_admin
  ENCODING 'UTF8'
  TEMPLATE template0;

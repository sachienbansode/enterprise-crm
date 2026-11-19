-- 20-amc-cro-user.sql — role "AMC-CRO" (full access to the AMC vertical, including Call Audits) and the AMC CRO user.
-- Safe to re-run. The password is NOT set here: set it once with the command in the release note (it prompts for it),
-- or from Admin → Users → Edit. Until then the user cannot sign in with a password.

INSERT INTO user_roles (role_name, vertical, description, permissions)
VALUES ('AMC-CRO', 'AMC', 'AMC Chief Risk Officer — full access to the AMC vertical, including Call Audits',
        '{"AI": true, "Admin": false, "Deals": true, "Leads": true, "Clients": true, "Reports": true, "Dashboard": true, "Compliance": true, "ServiceRequests": true, "CallAudits": true}'::jsonb)
ON CONFLICT (role_name) DO UPDATE SET vertical = 'AMC', is_active = TRUE;

INSERT INTO users (name, email, role, vertical, auth_type, status, mfa_enabled)
VALUES ('Sharad Hariom Dwivedi', 'sharad.dwivedi@ashikamf.com', 'AMC-CRO', 'AMC', 'app', 'Active', FALSE)
ON CONFLICT (email) DO UPDATE SET role = 'AMC-CRO', vertical = 'AMC', status = 'Active', updated_at = NOW();

INSERT INTO user_role_mapping (user_id, role_id, assigned_at, is_active)
SELECT u.id, r.id, NOW(), TRUE FROM users u, user_roles r
 WHERE lower(u.email) = 'sharad.dwivedi@ashikamf.com' AND r.role_name = 'AMC-CRO'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = TRUE;

SELECT name, email, role, vertical, status, (password_hash IS NOT NULL) AS password_set FROM users WHERE lower(email) = 'sharad.dwivedi@ashikamf.com';

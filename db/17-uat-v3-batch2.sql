-- 17-uat-v3-batch2.sql — data clean-up for UAT log v3 (NC-10). Safe to run more than once.
-- KYC can only be "Verified" with PAN and a mobile or e-mail; records that don't meet that go back to Pending.
UPDATE clients SET kyc_status = 'Pending', updated_at = NOW()
 WHERE kyc_status = 'Verified' AND (coalesce(trim(pan), '') = '' OR (coalesce(trim(mobile), '') = '' AND coalesce(trim(email), '') = ''));

-- Possible duplicate clients (same name once "Ltd / Limited / Pvt / Private" and punctuation are ignored) — review and merge by hand
WITH n AS (
  SELECT id, client_code, name,
         trim(regexp_replace(regexp_replace(lower(name), '\m(the|ltd|limited|pvt|private|llp|inc|co|company|corp|corporation)\M', ' ', 'g'), '[^a-z0-9]+', ' ', 'g')) AS k
    FROM clients
)
SELECT a.client_code, a.name, b.client_code AS possible_duplicate, b.name AS duplicate_name
  FROM n a JOIN n b ON a.k = b.k AND a.id < b.id ORDER BY a.name;

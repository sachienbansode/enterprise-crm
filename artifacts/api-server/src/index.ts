import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty } from "./lib/seed";
import { query } from "./lib/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Seed with UAT data if the database is empty (no-op when data already exists)
await seedIfEmpty();

// Ensure otp_store table exists (DB-backed OTP storage for multi-instance safety)
await query(`
  CREATE TABLE IF NOT EXISTS otp_store (
    email       VARCHAR(255) PRIMARY KEY,
    otp         VARCHAR(6)   NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`);
// Clean up any expired OTPs from previous runs
await query("DELETE FROM otp_store WHERE expires_at < NOW()");

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

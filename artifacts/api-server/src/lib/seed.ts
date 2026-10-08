import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";
import { pool } from "@workspace/db";
import { logger } from "./logger";

export async function seedIfEmpty(): Promise<void> {
  try {
    // ── 1. Check whether full seeding is needed ──────────────────────────────
    const tableCheck = await pool.query(
      "SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='users'"
    );
    const tableExists = tableCheck.rows[0].n > 0;

    let userCount = 0;
    if (tableExists) {
      const r = await pool.query("SELECT COUNT(*)::int AS n FROM users");
      userCount = r.rows[0].n;
    }

    const forceSeed = process.env.FORCE_DATA_SYNC === "1";

    if (userCount === 0 || forceSeed) {
      logger.info(
        { tableExists, userCount, forceSeed },
        "Database empty — running full seed…"
      );

      // ── 2. Locate the full SQL seed file ─────────────────────────────────
      const candidates = [
        resolve(process.cwd(), "scripts/db-init.sql"),
        resolve(__dirname, "../../../scripts/db-init.sql"),
        resolve(__dirname, "../../../../scripts/db-init.sql"),
      ];

      const sqlPath = candidates.find(existsSync) ?? null;

      if (!sqlPath) {
        logger.error({ candidates }, "Seed SQL file not found — skipping");
      } else {
        logger.info({ sqlPath }, "Running full seed via psql…");

        const dbUrl = process.env.DATABASE_URL!;
        const result = spawnSync("psql", ["-d", dbUrl, "-f", sqlPath], {
          stdio: ["ignore", "pipe", "pipe"],
          env: process.env as NodeJS.ProcessEnv,
        });

        if (result.status !== 0) {
          const stderr = result.stderr?.toString() ?? "";
          throw new Error(`psql exited ${result.status}: ${stderr.slice(0, 500)}`);
        }

        const after = await pool.query("SELECT COUNT(*)::int AS n FROM users");
        logger.info({ users: after.rows[0].n }, "Full seed completed");
      }
    } else {
      logger.info({ userCount }, "Database already has users — skipping full seed");
    }

    // ── 3. Always seed config tables if they are empty ───────────────────────
    await seedConfigTablesIfEmpty();
  } catch (err: any) {
    logger.error({ err: err?.message ?? err }, "Seed failed — server will still start");
  }
}

async function seedConfigTablesIfEmpty(): Promise<void> {
  try {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM dropdown_config)    AS dc,
        (SELECT COUNT(*)::int FROM pipeline_stages)    AS ps,
        (SELECT COUNT(*)::int FROM pii_masking_fields) AS pmf
    `);
    const { dc, ps, pmf } = r.rows[0];

    if (dc > 0 && ps > 0 && pmf > 0) {
      logger.info({ dc, ps, pmf }, "Config tables already seeded — skipping config seed");
      return;
    }

    logger.info(
      { dropdown_config: dc, pipeline_stages: ps, pii_masking_fields: pmf },
      "Config tables empty — seeding config data…"
    );

    const candidates = [
      resolve(process.cwd(), "scripts/seed-config.sql"),
      resolve(__dirname, "../../../scripts/seed-config.sql"),
      resolve(__dirname, "../../../../scripts/seed-config.sql"),
    ];

    const sqlPath = candidates.find(existsSync) ?? null;

    if (!sqlPath) {
      logger.error({ candidates }, "seed-config.sql not found — skipping config seed");
      return;
    }

    const dbUrl = process.env.DATABASE_URL!;
    const result = spawnSync("psql", ["-d", dbUrl, "-f", sqlPath], {
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env as NodeJS.ProcessEnv,
    });

    if (result.status !== 0) {
      const stderr = result.stderr?.toString() ?? "";
      throw new Error(`config seed psql exited ${result.status}: ${stderr.slice(0, 500)}`);
    }

    const after = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM dropdown_config)    AS dc,
        (SELECT COUNT(*)::int FROM pipeline_stages)    AS ps,
        (SELECT COUNT(*)::int FROM pii_masking_fields) AS pmf
    `);
    logger.info(
      { dropdown_config: after.rows[0].dc, pipeline_stages: after.rows[0].ps, pii_masking_fields: after.rows[0].pmf },
      "Config seed completed"
    );
  } catch (err: any) {
    logger.error({ err: err?.message ?? err }, "Config seed failed — server will still start");
  }
}

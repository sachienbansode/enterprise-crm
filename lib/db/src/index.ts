import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Return SQL DATE columns as plain "YYYY-MM-DD" strings. Parsing them into JS Dates shifted
// them to the previous day for IST users (midnight IST = 18:30 UTC the day before).
pg.types.setTypeParser(1082, (v: string) => v);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";

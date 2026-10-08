import { pool } from "@workspace/db";

export { pool };

export async function query(text: string, params?: any[]) {
  const result = await pool.query(text, params);
  return result;
}

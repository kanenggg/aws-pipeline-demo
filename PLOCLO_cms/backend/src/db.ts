import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

export async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("✅ PostgreSQL connected:", res.rows[0]);
  } catch (err) {
    console.error("❌ DB connection error:", err);
  }
}

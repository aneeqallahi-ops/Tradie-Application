import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "[db] WARNING: DATABASE_URL is not set. Database operations will fail. " +
      "Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL ?? "postgres://localhost/tradeledger",
});
export const db = drizzle(pool, { schema });

export * from "./schema";

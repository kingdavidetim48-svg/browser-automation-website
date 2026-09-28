// Database client for Neon Postgres using Drizzle ORM
// Provides a singleton instance for use across the application

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create the neon HTTP client
const sql = neon(databaseUrl);

// Create the drizzle instance with schema
export const db = drizzle(sql, { schema });

// Export the schema for convenience
export { schema };

// Export types
export type DB = typeof db;
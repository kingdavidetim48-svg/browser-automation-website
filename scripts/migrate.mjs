import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { getMigrations } from "../node_modules/better-auth/dist/db/get-migration.mjs";

const auth = betterAuth({
  database: new DatabaseSync("auth.db"),
  secret: process.env.BETTER_AUTH_SECRET || "temp-migration-secret-must-be-long-enough-32",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
});

console.log("Running Better Auth migrations...");
const { runMigrations, toBeCreated, compileMigrations } = await getMigrations(auth.options);
console.log(`Tables to create: ${toBeCreated.map(t => t.table).join(", ")}`);
const sql = await compileMigrations();
console.log("SQL to execute:\n", sql);
await runMigrations();
console.log("Migrations completed successfully!");

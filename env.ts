// Environment variable loader for server-side code
// Loads .env.local and .env files

import "dotenv/config";

// This file is imported by drizzle.config.ts to load environment variables
// before the config is evaluated.

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  NEON_BRANCH: process.env.NEON_BRANCH,
};
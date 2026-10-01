// Environment variable declarations for server-side code

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED,
  NEON_BRANCH: process.env.NEON_BRANCH,
  // Clerk (server-side only - never expose to client)
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  // Browserbase
  BROWSERBASE_API_KEY: process.env.BROWSERBASE_API_KEY,
  BROWSERBASE_PROJECT_ID: process.env.BROWSERBASE_PROJECT_ID,
};
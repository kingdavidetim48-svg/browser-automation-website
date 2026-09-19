import { betterAuth } from "better-auth";
import { DatabaseSync } from "node:sqlite";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  database: new DatabaseSync("auth.db"),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
});
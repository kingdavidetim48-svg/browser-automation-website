# KingsFlow Agent — Complete External Service & Environment Setup Guide

**Project:** KingsFlow Agent  
**Repository Directory:** `C:\Users\LOYAL\Desktop\WEB\relay\browser-automation`  
**Date:** November 12, 2026  
**Confidentiality Notice:** This document lists configuration keys and instructions for obtaining them. No secret values or sensitive tokens are stored in this document.

---

## 1. Master Environment Variable Matrix

| Variable | Service | Purpose | Required? | Where to obtain it | Used by |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | Client-side identifier for Clerk authentication SDK and components | **Yes** | Clerk Dashboard → Project Settings → API Keys | `app/layout.tsx`, `<SignIn />`, `<SignUp />`, `<UserButton />`, `<OrganizationSwitcher />` |
| `CLERK_SECRET_KEY` | Clerk | Server-side credential for verifying JWTs, reading user details, and organization membership | **Yes** | Clerk Dashboard → Project Settings → API Keys | `proxy.ts`, `app/api/liveblocks/users/route.ts`, `app/api/replays/[sessionId]/route.ts`, `features/workflows/actions.ts` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Clerk | Declares the route path for the sign-in page | **Yes** | Set to `/sign-in` | Clerk middleware, redirection logic |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Clerk | Declares the route path for the sign-up page | **Yes** | Set to `/sign-up` | Clerk middleware, redirection logic |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Clerk | Fallback URL after successful authentication | **Yes** | Set to `/` or `/dashboard` | Clerk Provider |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Clerk | Fallback URL after account registration | **Yes** | Set to `/` or `/dashboard` | Clerk Provider |
| `DATABASE_URL` | Neon PostgreSQL | Pooled connection string using `@neondatabase/serverless` HTTP driver | **Yes** | Neon Console → Project → Connection Details (Pooled) | `lib/db/index.ts`, `drizzle.config.ts`, `features/workflows/data.ts` |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL | Direct unpooled connection string for schema migrations and Drizzle Kit | Recommended | Neon Console → Connection Details → Check "Direct connection" | `drizzle.config.ts`, `npm run db:push`, `scripts/migrate.mjs` |
| `NEON_BRANCH` | Neon PostgreSQL | Active branch name for Neon migrations and branch isolation | Optional | Neon Console → Branches | Neon CLI and branch-based deployment pipelines |
| `TRIGGER_SECRET_KEY` | Trigger.dev | Secret key for triggering durable background tasks | **Yes** | Trigger.dev Dashboard → Project → API Keys | `features/workflows/actions.ts` (`tasks.trigger`), `trigger:dev` worker |
| `TRIGGER_PROJECT_REF` | Trigger.dev | Project identifier string matching `trigger.config.ts` | Recommended | Trigger.dev Dashboard → Project Settings | Trigger.dev CLI deployments |
| `BROWSERBASE_API_KEY` | Browserbase | Secret key for creating cloud browser sessions and retrieving session replays | **Yes** | Browserbase Dashboard → Settings → API Keys | `features/workflows/tasks/run-workflow.ts`, `app/api/replays/[sessionId]/route.ts` |
| `BROWSERBASE_PROJECT_ID` | Browserbase | Project identifier to group browser sessions | Optional | Browserbase Dashboard → Settings → Project ID | `features/workflows/tasks/run-workflow.ts` (Stagehand constructor) |
| `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` | Liveblocks | Public key for client-side Liveblocks room connectivity | **Yes** | Liveblocks Dashboard → Project → API Keys | `features/workflows/components/room.tsx` |
| `LIVEBLOCKS_SECRET_KEY` | Liveblocks | Server secret key for issuing room auth tokens and user presence | **Yes** | Liveblocks Dashboard → Project → API Keys (starts with `sk_`) | `lib/liveblocks.ts`, `app/api/liveblocks/auth/route.ts` |
| `GEMINI_API_KEY` | Google Gemini | API key for autonomous Agent node execution | Optional* | Google AI Studio (`aistudio.google.com`) | `features/workflows/nodes/agent.ts` (*Required only if using Agent node without Browserbase Model Gateway) |
| `RESEND_API_KEY` | Resend | API key for sending emails from the Send Email node | Optional* | Resend Dashboard (`resend.com`) → API Keys | `lib/resend.ts`, `features/workflows/nodes/send-email.ts` (*Required only if workflow uses Send Email node) |
| `RESEND_FROM_EMAIL` | Resend | Verified sender email address | Optional* | Resend Dashboard → Domains / Senders | `features/workflows/nodes/send-email.ts` (Defaults to `onboarding@resend.dev` in development) |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry | Client-side DSN for browser error logging and performance tracing | Optional | Sentry Dashboard → Project Settings → Client Keys (DSN) | `instrumentation-client.ts` |
| `SENTRY_DSN` | Sentry | Server-side DSN for edge/Node request error capture | Optional | Sentry Dashboard → Project Settings → Client Keys (DSN) | `sentry.server.config.ts`, `sentry.edge.config.ts` |
| `SENTRY_AUTH_TOKEN` | Sentry | Auth token for uploading sourcemaps during production build | Optional | Sentry Dashboard → User Settings → Auth Tokens | `trigger.config.ts`, CI/CD build scripts |

---

## 2. Service-by-Service Configuration Instructions

### 2.1 Clerk Authentication & Organizations
KingsFlow is built as a multi-tenant platform where all workflows, Liveblocks collaboration rooms, and run executions belong to a Clerk Organization.

1. **Create Clerk Application:**
   - Navigate to [dashboard.clerk.com](https://dashboard.clerk.com).
   - Create a new project.
2. **Enable Organizations:**
   - In Clerk Dashboard, go to **Configure** → **Organization Settings**.
   - Enable **Organizations**.
   - Allow users to create organizations.
3. **Configure Clerk Billing (For Pro Plan Gating):**
   - KingsFlow gates the autonomous `Agent` node and `Session Replay` video access behind the `"pro"` plan.
   - In Clerk Dashboard, go to **Configure** → **Pricing & Plans** (or Billing).
   - Create an organization plan with slug: `pro`.
   - The `<PricingTable for="organization" />` on KingsFlow's `/billing` route will display this tier.
4. **Environment Variables:**
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
   ```
5. **Validation Test:**
   - Start the development server (`npm run dev`).
   - Navigate to `http://localhost:3000/sign-in`.
   - Sign in and ensure redirection routes to `/choose-organization` if no organization is active, or `/` when an organization is selected.

---

### 2.2 Neon PostgreSQL Database
KingsFlow uses Neon serverless Postgres with the `@neondatabase/serverless` HTTP connection driver and Drizzle ORM.

1. **Create Neon Project:**
   - Navigate to [neon.tech](https://neon.tech) and log in.
   - Create a project (e.g., `kingsflow-db`).
2. **Retrieve Connection Strings:**
   - Copy the connection URL for your branch.
   - Pooled connection format: `postgresql://[user]:[password]@[endpoint]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require`
   - Unpooled connection format: `postgresql://[user]:[password]@[endpoint].[region].aws.neon.tech/[dbname]?sslmode=require`
3. **Environment Variables:**
   ```env
   DATABASE_URL=postgresql://user:password@ep-pooler.neon.tech/kingsflow?sslmode=require
   DATABASE_URL_UNPOOLED=postgresql://user:password@ep.neon.tech/kingsflow?sslmode=require
   NEON_BRANCH=main
   ```
4. **Validation Test:**
   - Run: `npm run db:migrate:pg` (or `npx drizzle-kit push`).
   - Verify table `workflows` exists with columns: `id`, `organization_id`, `name`, `graph` (JSONB), `created_at`, `updated_at`.

---

### 2.3 Trigger.dev (Durable Workflow Execution)
Trigger.dev handles background execution of the `run-workflow` task, ensuring workflows do not time out on standard serverless HTTP limits and providing real-time status updates.

1. **Create Trigger.dev Project:**
   - Navigate to [cloud.trigger.dev](https://cloud.trigger.dev).
   - Create a new project named `kingsflow`.
   - Copy the Project Reference ID and secret API key.
2. **Environment Variables:**
   ```env
   TRIGGER_SECRET_KEY=tr_dev_...
   TRIGGER_PROJECT_REF=proj_...
   ```
3. **Update Configuration:**
   - In `trigger.config.ts`, verify `project: "your_project_ref"` matches your dashboard project.
4. **Validation Test:**
   - Start the local dev worker: `npx trigger.dev@latest dev`
   - The worker should output: `Registered 1 task: run-workflow`.

---

### 2.4 Browserbase (Cloud Browser Infrastructure)
Browserbase hosts headless Chromium sessions for Stagehand, records execution videos, and provides session replays.

1. **Create Browserbase Account:**
   - Navigate to [browserbase.com](https://browserbase.com) and create an account.
2. **Retrieve Credentials:**
   - Copy your **API Key** from Dashboard → Settings.
   - Copy your **Project ID**.
3. **Environment Variables:**
   ```env
   BROWSERBASE_API_KEY=bb_...
   BROWSERBASE_PROJECT_ID=...
   ```
4. **Validation Test:**
   - When a workflow containing an `Open URL` node runs, verify in Browserbase Dashboard → Sessions that a live Chromium session starts.
   - Once completed, inspect `/api/replays/[sessionId]` to confirm HLS playlist retrieval.

---

### 2.5 Liveblocks (Multiplayer Collaboration)
Liveblocks synchronizes React Flow nodes and edges in real time across team members in the same organization and powers multiplayer cursors and presence avatars.

1. **Create Liveblocks Project:**
   - Navigate to [liveblocks.io](https://liveblocks.io) and create a project.
2. **Retrieve Keys:**
   - Copy the **Public Key** (`pk_...`) for `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`.
   - Copy the **Secret Key** (`sk_...`) for `LIVEBLOCKS_SECRET_KEY`.
3. **Environment Variables:**
   ```env
   NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=pk_dev_...
   LIVEBLOCKS_SECRET_KEY=sk_dev_...
   ```
4. **Validation Test:**
   - Open a workflow page in two separate browser windows (or an incognito window signed into the same Clerk organization).
   - Move the cursor on one canvas; verify the remote cursor and avatar appear in real time on the second window.

---

### 2.6 AI Model Providers (Gemini / Model Gateway)
Stagehand requires an LLM to interpret natural language instructions for `act`, `extract`, `observe`, and `agent` nodes.

- **Option A (Default - Browserbase Model Gateway):**
  If `BROWSERBASE_API_KEY` is configured, Stagehand routes model calls through Browserbase's managed Model Gateway without requiring a standalone provider key.
- **Option B (Direct Gemini API Key):**
  For the autonomous `Agent` node (`features/workflows/nodes/agent.ts`), KingsFlow allows direct evaluation using Google Gemini (`google/gemini-2.5-flash`).
  ```env
  GEMINI_API_KEY=AIzaSy...
  ```
  Obtain from [aistudio.google.com](https://aistudio.google.com).

---

### 2.7 Resend (Transactional Email Execution)
The `Send Email` node dispatches emails containing workflow results or interpolated variables.

1. **Create Resend Account:**
   - Navigate to [resend.com](https://resend.com).
   - Generate an API key.
2. **Domain Verification:**
   - For production, add and verify your custom sending domain.
   - For local development, Resend allows testing using `onboarding@resend.dev` to your verified account email.
3. **Environment Variables:**
   ```env
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=onboarding@resend.dev
   ```

---

### 2.8 Sentry (Observability & Error Tracing)
Sentry tracks unhandled server errors, edge runtime failures, and client-side exceptions.

1. **Create Sentry Project:**
   - Navigate to [sentry.io](https://sentry.io).
   - Select "Next.js" framework.
2. **Environment Variables:**
   ```env
   NEXT_PUBLIC_SENTRY_DSN=https://...@ingest.sentry.io/...
   SENTRY_DSN=https://...@ingest.sentry.io/...
   SENTRY_AUTH_TOKEN=sntrys_...
   ```
3. **Behavior:**
   - If Sentry environment variables are omitted, KingsFlow's instrumentation safely no-ops without throwing errors.

---

## 3. Production Deployment Checklist

1. [ ] Neon Postgres connection pooling verified with SSL (`?sslmode=require`).
2. [ ] Database migrations executed against production database.
3. [ ] Clerk production keys (`pk_live_...` and `sk_live_...`) set with organization support enabled.
4. [ ] Clerk Billing configured with plan slug `pro`.
5. [ ] Liveblocks production secret (`sk_prod_...`) and public key (`pk_prod_...`) set with allowed domain origins.
6. [ ] Browserbase API key set with account usage limits configured.
7. [ ] Trigger.dev production project deployed via `npx trigger.dev@latest deploy`.
8. [ ] Resend sending domain verified with SPF, DKIM, and DMARC DNS records.
9. [ ] Sentry DSN configured for production monitoring.

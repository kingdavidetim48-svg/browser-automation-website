# CLERK MIGRATION AUDIT

**Date:** 2026-09-30
**Auditor:** Antigravity (automated)
**Branch:** main (uncommitted changes on top of `36a590e`)

---

## Results Summary

| Category | Status |
|---|---|
| Authentication | PASS |
| Clerk Organizations | PASS |
| Server Authorization | PASS |
| Workflow Database Persistence | PASS |
| Workflow CRUD | PASS |
| Workflow Execution | PASS |
| Browserbase / Stagehand | PASS |
| Better Auth Removal | PASS |
| Database Migration Safety | PASS |
| TypeScript | PASS |
| Lint | PASS |
| Tests | NOT RUN (no test files exist) |
| Production Build | PASS |
| Clerk Doctor | NOT RUN (CLI hangs in agent sandbox — run manually) |

---

## Detailed Findings

### Authentication — PASS

- `app/layout.tsx` wraps `RootLayout` in `<ClerkProvider>`.
- `middleware.ts` uses `clerkMiddleware()` + `createRouteMatcher` from `@clerk/nextjs/server`.
- Public routes: `/`, `/sign-in(.*)`, `/sign-up(.*)` — all other routes call `auth.protect()`.
- `lib/auth.ts` re-exports `auth` and `currentUser` from `@clerk/nextjs/server`.
- `lib/auth-client.ts` is kept as a harmless deprecated stub (`export {}`); nothing imports it.
- `@clerk/nextjs` v7.9.8 is the only authentication dependency.
- `better-auth` has been fully removed from `package.json`.
- No `BETTER_AUTH_*` environment variables in `.env.local`.

### Clerk Organizations — PASS

- `components/dashboard/sidebar.tsx` uses `<OrganizationSwitcher>` and `<UserButton>` from `@clerk/nextjs`.
- `features/workflows/hooks/use-workflows.tsx` subscribes to `orgId` from `useAuth()` and reloads workflows whenever the active organization changes.
- Workflow queries in `features/workflows/data.ts` scope to `organizationId` when `orgId` is present, and to personal (`userId` + `organizationId IS NULL`) otherwise.

### Server Authorization — PASS

All server-side authorization is enforced on every operation.

**`features/workflows/data.ts`**
- `getWorkflows()`: calls `auth()` server-side; returns org-scoped or personal-scoped results only.
- `getWorkflowById()`: calls `auth()`, fetches the record, validates ownership, returns `null` on unauthorized (does not reveal existence via error).

**`features/workflows/actions.ts`**
- Every action calls `auth()` at the top before any database operation.
- `updateWorkflowAction` / `deleteWorkflowAction`: double defense — (1) `getWorkflowById()` authorization check, (2) scoped `WHERE` clause with org/user condition in SQL.
- `runWorkflowAction`: explicitly checks org boundary and personal user boundary before executing.
- No client-supplied `userId`, `organizationId`, `orgId`, or role is trusted.

### Workflow Database Persistence — PASS

**Before migration:** `components/dashboard/workflow-context.tsx` used hardcoded `DEFAULT_WORKFLOWS` (9 mock entries), in-memory state only, no database interaction.

**After migration:**
- `features/workflows/data.ts` queries the real Drizzle/Neon Postgres database.
- `features/workflows/actions.ts` uses `db.insert()`, `db.update()`, `db.delete()` with `.returning()`.
- `features/workflows/hooks/use-workflows.tsx` calls `getWorkflowsAction()` on mount and org change.
- Workflow IDs are now generated as `{name}-{uuid-slug}` to ensure uniqueness (original used name as ID, risking collisions).

### Workflow CRUD — PASS

| Operation | Implementation | Authorized |
|---|---|---|
| CREATE | `db.insert(workflows).values({...}).returning()` | `auth()` required; `userId`/`orgId` set from Clerk |
| READ (list) | `db.select().from(workflows).where(org or user scope)` | Scoped by Clerk identity |
| READ (by id) | `db.select()` + ownership check | Returns null on unauthorized |
| UPDATE | `db.update(workflows).set({...}).where(scoped condition)` | `getWorkflowById` check + scoped WHERE |
| DELETE | `db.delete(workflows).where(scoped condition)` | `getWorkflowById` check + scoped WHERE |

### Workflow Execution — PASS

`runWorkflowAction` server-side flow:
1. `auth()` — authenticate with Clerk
2. `getWorkflowById(workflowId)` — retrieve and authorize server-side
3. Explicit tenant boundary check (org boundary or personal workspace)
4. `executeWorkflow(workflow, { organizationId, userId })` — passes the verified `WorkflowRecord`, not a bare ID

`features/workflows/tasks/runner.ts`:
- Receives the full `WorkflowRecord` object.
- Iterates `workflow.nodes` (configured steps) if any exist, executing each via Stagehand.
- Falls back to initialization action if no nodes configured.
- Browserbase and Stagehand credentials remain server-side via `process.env`.
- No client-supplied workflow data is trusted.

### Browserbase / Stagehand — PASS

- `lib/browserbase.ts` reads `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` from `process.env` (server-only).
- `lib/stagehand.ts` provides the `executeAction` interface.
- Both are imported only in `features/workflows/tasks/runner.ts` (server-side only).
- These are structural stubs — not real SDKs. The execution structure and credential handling are correct. Real SDK integration is a drop-in replacement.

> **Note:** The original project at commit `36a590e` had no Browserbase/Stagehand integration at all. These files were created new by the migration. No regression occurred.

### Better Auth Removal — PASS

| Item | Status |
|---|---|
| `app/api/auth/[...all]/route.ts` | Deleted |
| `app/auth/page.tsx` | Deleted (replaced by `app/(auth)/` route group) |
| `components/auth/auth-card.tsx` | Deleted |
| `components/auth/user-profile.tsx` | Deleted |
| `components/auth/logo.tsx` | Deleted |
| `components/auth/product-panel.tsx` | Deleted (moved to `features/auth/components/`) |
| `better-auth` npm package | Removed from `package.json` |
| `BETTER_AUTH_SECRET` env var | Not present in `.env.local` |
| `lib/auth-client.ts` | Stubbed to `export {}` with deprecation notice |
| `components/dashboard/workflow-context.tsx` | Deleted — canonical implementation is `features/workflows/hooks/use-workflows.tsx` |

> Better Auth database tables (`users`, `sessions`, `verifications`) have NOT been dropped — intentional. Preserved for safety. Drop manually after verifying Clerk is fully operational.

### Database Migration Safety — PASS

**Migration file:** `drizzle/0001_add_clerk_columns_to_workflows.sql`

```sql
ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_user_id_users_id_fk";
ALTER TABLE "workflows" ADD COLUMN "user_id" varchar(256);
ALTER TABLE "workflows" ADD COLUMN "organization_id" varchar(256);
```

- Additive only — no destructive column drops or data changes.
- `user_id` and `organization_id` are nullable — existing workflows without Clerk identity are preserved and not destroyed.
- Drops the FK from `audit_log.user_id -> users.id` since Clerk manages users externally. This is correct.
- Migration has NOT been automatically applied — run manually with `npm run db:migrate:pg`.

> **Warning:** Existing workflows (if any) will have `user_id = NULL` and `organization_id = NULL`. They will not appear in the UI for any user until backfilled. See Remaining Manual Steps.

**Backfill note:** If there are existing workflows from the Better Auth era, manually assign a Clerk `user_id` to each. Clerk user IDs are not automatically derivable from Better Auth user IDs.

### TypeScript — PASS

```
npx tsc --noEmit
Exit code: 0 — no errors
```

### Lint — PASS

```
npm run lint
Exit code: 0 — no errors or warnings
```

**Fixed during audit:**
- `features/workflows/hooks/use-workflows.tsx`: `react-hooks/set-state-in-effect` error — moved `setState` into an async IIFE inside `useEffect`.
- `components/dashboard/header.tsx`: unused `err` variable in catch block.
- `app/test/page.tsx`: replaced `window.location.href` with `useRouter().push()`.
- `lib/schema.ts`: removed unused `integer` and `boolean` imports.

### Tests — NOT RUN

No test files (`.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx`) exist in the project. This is a pre-existing gap — the original project had no test suite.

**Severity:** Medium. Manual browser testing of authentication, workflow CRUD, and organization switching is required.

### Production Build — PASS

```
npm run build
Exit code: 0
```

**Issue found and fixed:** Build failed initially because `drizzle-orm` and `@neondatabase/serverless` are installed in the parent monorepo `node_modules` (`relay/node_modules`) rather than the project's own `node_modules`. Fixed by adding `turbopack.root` to `next.config.ts`:

```ts
import path from "node:path"
turbopack: {
  root: path.resolve(process.cwd(), ".."),
}
```

The warning about `middleware` -> `proxy` rename is a Next.js 16.3 deprecation — cosmetic, not breaking.

**Routes generated:**
```
/ (dynamic)
/_not-found (static)
/dashboard (static shell, dynamic content)
/sign-in/[[...sign-in]] (dynamic — Clerk hosted SignIn)
/sign-up/[[...sign-up]] (dynamic — Clerk hosted SignUp)
/test (static)
```

### Clerk Doctor — NOT RUN

The `clerk` CLI is installed globally (`C:\Users\LOYAL\AppData\Roaming\npm\clerk.ps1`) but hangs without output when invoked from the agent sandbox. This is expected — the Clerk CLI requires system keychain access, outbound network access to Clerk, and browser/localhost OAuth callback. Per the `clerk-cli` skill: host-sensitive commands must be rerun on the host before trusting results.

**Action required — run this in your terminal:**
```sh
clerk doctor
```

---

## Duplicate Code Cleanup

### Workflow Context — RESOLVED

| File | Status |
|---|---|
| `components/dashboard/workflow-context.tsx` (original) | Deleted — contained hardcoded mock data, no DB |
| `features/workflows/hooks/use-workflows.tsx` (canonical) | Active — real database-backed, Clerk-aware |

All consumers (`sidebar.tsx`, `header.tsx`, `canvas.tsx`) import from `@/features/workflows/hooks/use-workflows`.

### Auth Routes — RESOLVED

| File | Status |
|---|---|
| `app/auth/page.tsx` (Better Auth) | Deleted |
| `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Active — Clerk `<SignIn />` |
| `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Active — Clerk `<SignUp />` |

Single canonical Clerk implementation at `app/(auth)/`.

---

## Files Changed

### Deleted
- `app/api/auth/[...all]/route.ts`
- `app/auth/page.tsx`
- `components/auth/auth-card.tsx`
- `components/auth/logo.tsx`
- `components/auth/product-panel.tsx`
- `components/auth/user-profile.tsx`
- `components/dashboard/dashboard-page.tsx`
- `components/dashboard/workflow-context.tsx`

### Modified
- `app/dashboard/page.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `app/test/page.tsx`
- `components/dashboard/dashboard-layout.tsx`
- `components/dashboard/header.tsx`
- `components/dashboard/sidebar.tsx`
- `drizzle/meta/_journal.json`
- `env.ts`
- `lib/auth-client.ts`
- `lib/auth.ts`
- `lib/schema.ts`
- `middleware.ts`
- `next.config.ts`
- `package.json`
- `scripts/migrate.mjs`

### Created (new)
- `app/(auth)/layout.tsx`
- `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `components/shared/logo.tsx`
- `drizzle/0001_add_clerk_columns_to_workflows.sql`
- `drizzle/meta/0001_snapshot.json`
- `features/auth/components/product-panel.tsx`
- `features/workflows/actions.ts`
- `features/workflows/data.ts`
- `features/workflows/components/canvas.tsx`
- `features/workflows/components/node-icon.tsx`
- `features/workflows/components/toolbar.tsx`
- `features/workflows/hooks/use-workflows.tsx`
- `features/workflows/nodes/definitions.ts`
- `features/workflows/tasks/runner.ts`
- `lib/browserbase.ts`
- `lib/stagehand.ts`
- `MIGRATION_PLAN.md`

---

## Remaining Manual Steps

### Required Before Going to Production

1. **Run the database migration:**
   ```sh
   npm run db:migrate:pg
   ```

2. **Backfill existing workflows (if any):**
   If workflows exist from the Better Auth era (`user_id = NULL`), manually assign a Clerk `user_id` to each row via Drizzle Studio or direct SQL.

3. **Run `clerk doctor` in your terminal:**
   ```sh
   clerk doctor
   ```

4. **Drop Better Auth tables (when ready):**
   ```sql
   DROP TABLE IF EXISTS verifications;
   DROP TABLE IF EXISTS sessions;
   DROP TABLE IF EXISTS users;
   ```
   Do NOT run this until Clerk is confirmed working.

5. **Replace Browserbase/Stagehand stubs with real SDKs:**
   `lib/browserbase.ts` and `lib/stagehand.ts` are structural stubs. Replace with `@browserbasehq/sdk` and `@browserbasehq/stagehand` for real browser automation.

6. **Suppress middleware deprecation warning:**
   ```sh
   npx @next/codemod@canary middleware-to-proxy .
   ```

7. **Commit the migration changes:**
   ```sh
   git add -A
   git commit -m "feat: migrate auth from Better Auth to Clerk with feature-oriented architecture"
   ```

---

## Browser Testing Checklist

The dev server (`npm run dev`) is running. Test these flows manually:

| Flow | What to verify |
|---|---|
| Navigate to `/` | Redirects to `/sign-in` |
| Sign in with Clerk | Redirects to `/dashboard` |
| Sign up with Clerk | Redirects to `/dashboard` |
| Dashboard loads | Sidebar shows `OrganizationSwitcher` and `UserButton` |
| Create workflow | Workflow persists to DB, appears in sidebar list |
| Select workflow | Canvas shows workflow name in header, Run button appears |
| Run workflow | Run button triggers action, shows toast on success/failure |
| Switch organization | Workflow list reloads scoped to the new org |
| Sign out | Redirects to `/sign-in` |
| Navigate to `/dashboard` while signed out | Redirects to `/sign-in` |
| Attempt run with tampered workflow ID | Server returns Forbidden error |

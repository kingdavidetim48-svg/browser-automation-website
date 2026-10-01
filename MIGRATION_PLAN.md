# MIGRATION PLAN: KingsFlow Architecture + Clerk Authentication & Organizations

## Executive Summary

This document specifies the migration plan to reorganize `browser-automation/` into a clean, feature-oriented, workflow-oriented architecture inspired by the `kingsflow/` blueprint while preserving all KingsFlow/KingsTalk functionality, and migrating authentication and multi-tenancy from Better Auth to **Clerk** and **Clerk Organizations** (using `@clerk/nextjs` App Router integration).

---

## 1. Migration Inventory & File Actions Table

| Current Location | Proposed Location | Action | Reason | Dependencies | Risk |
| ---------------- | ----------------- | ------ | ------ | ------------ | ---- |
| `components/dashboard/dashboard-page.tsx` | `features/workflows/components/canvas.tsx` & `features/workflows/components/toolbar.tsx` | SPLIT & MOVE | Separate workflow canvas and node palette into feature domain | `workflow-context`, icons | Low |
| `components/dashboard/workflow-context.tsx` | `features/workflows/hooks/use-workflows.tsx` & `features/workflows/data.ts` | MOVE & ENHANCE | Feature-scoped state management and data fetching | React context, Drizzle | Low |
| `components/dashboard/workflow-icon.tsx` | `features/workflows/components/node-icon.tsx` | MOVE & RENAME | Standardize node icon inside workflow components | Lucide icons | Very Low |
| `components/dashboard/sidebar.tsx` | `components/dashboard/sidebar.tsx` (App Shell) | KEEP & REFACTOR | Keep app shell in components/dashboard, replace Better Auth with Clerk UserButton and OrganizationSwitcher | Clerk Next.js SDK, shadcn | Medium |
| `components/dashboard/header.tsx` | `components/dashboard/header.tsx` | KEEP & REFACTOR | Preserves app shell header, sync with active workflow | Lucide, use-workflows | Low |
| `components/dashboard/dashboard-layout.tsx` | `components/dashboard/dashboard-layout.tsx` | KEEP | Application dashboard shell layout | Header, Sidebar | Low |
| `components/auth/auth-card.tsx` | `features/auth/components/auth-card.tsx` | MOVE & ADAPT | Adapt auth presentation to Clerk `<SignIn />` / `<SignUp />` | Clerk UI / Components | Low |
| `components/auth/logo.tsx` | `components/shared/logo.tsx` | MOVE | Reusable brand logo across app | Tailwind, Lucide | Very Low |
| `components/auth/product-panel.tsx` | `features/auth/components/product-panel.tsx` | MOVE | Domain-specific marketing auth panel | Tailwind | Very Low |
| `components/auth/user-profile.tsx` | `features/auth/components/user-profile.tsx` | MOVE & REFACTOR | Switch from Better Auth session to Clerk `<UserButton />` / `useUser` | Clerk SDK | Low |
| `lib/auth-client.ts` | `lib/auth.ts` / delete when complete | DEPRECATE & REMOVE | Better Auth client replaced by `@clerk/nextjs` client hooks (`useUser`, `useAuth`, `useOrganization`) | Better Auth | Medium |
| `lib/auth.ts` | `lib/auth.ts` | REFACTOR | Server auth helper wrapping `@clerk/nextjs/server` `auth()` and org checks | `@clerk/nextjs/server` | Medium |
| `app/api/auth/[...all]/route.ts` | *N/A (removed after Clerk verified)* | REMOVE | Better Auth catch-all API handler replaced by Clerk proxy & middleware | Better Auth | Low |
| `middleware.ts` | `middleware.ts` (or `proxy.ts`) | REFACTOR | Integrate `clerkMiddleware()` with route protection matching Next.js 16 requirements | `@clerk/nextjs/server` | Medium |
| `lib/schema.ts` | `lib/schema.ts` (or `lib/db/schema.ts`) | REFACTOR | Add `organization_id` & `user_id` to workflows; deprecate Better Auth sessions/verifications tables | Drizzle ORM | Medium |
| `lib/db.ts` | `lib/db/index.ts` | MOVE | Group database connection & utilities cleanly | Neon serverless, Drizzle | Very Low |
| `app/auth/page.tsx` | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` & `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | SPLIT & REFACTOR | Standard Clerk App Router catch-all pages matching existing split layout | Clerk Components | Low |
| `app/dashboard/page.tsx` | `app/(dashboard)/dashboard/page.tsx` | MOVE | Group dashboard under route group `(dashboard)` | DashboardLayout, Canvas | Low |
| `app/page.tsx` | `app/page.tsx` | KEEP | Landing / redirect root page | Next.js navigation | Very Low |

---

## 2. Architecture Migration

The project will transition from flat component groupings to a feature-oriented modular architecture aligned with `kingsflow/` while strictly keeping real KingsFlow logic:

```text
browser-automation/
├── app/
│   ├── (auth)/
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   └── sign-up/[[...sign-up]]/page.tsx
│   ├── (dashboard)/
│   │   └── dashboard/page.tsx
│   ├── api/
│   │   └── workflows/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── dashboard/
│   │   ├── dashboard-layout.tsx
│   │   ├── header.tsx
│   │   └── sidebar.tsx
│   ├── shared/
│   │   └── logo.tsx
│   └── ui/
│       └── [shadcn components: button, dialog, dropdown-menu, popover, sidebar, etc.]
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── auth-card.tsx
│   │   │   ├── product-panel.tsx
│   │   │   └── user-profile.tsx
│   │   └── lib/
│   └── workflows/
│       ├── actions.ts             # Server actions (createWorkflow, updateWorkflow, deleteWorkflow, runWorkflow)
│       ├── data.ts                # Server queries (getWorkflows, getWorkflowById)
│       ├── components/
│       │   ├── canvas.tsx         # Interactive canvas UI
│       │   ├── header-controls.tsx# Run button, collaborators badges
│       │   ├── node-icon.tsx      # Node type icon helper
│       │   ├── right-sidebar.tsx  # Triggers & Actions panel (Toolbar / Editor tabs)
│       │   └── workflow-list.tsx  # Workflows list component
│       ├── hooks/
│       │   └── use-workflows.tsx  # Workflow state hook / context
│       ├── lib/
│       │   └── validation.ts      # Graph & node validation
│       ├── nodes/
│       │   └── definitions.ts     # Triggers (Start) & Actions (Open URL, Act, Extract, Observe, Agent, Send Email)
│       └── tasks/
│           └── runner.ts          # Workflow execution orchestrator
│
├── hooks/
│   └── use-mobile.ts
│
├── lib/
│   ├── db/
│   │   ├── index.ts               # Drizzle database client singleton
│   │   └── schema.ts              # Drizzle PostgreSQL schema definitions
│   ├── browserbase.ts             # Shared Browserbase client helper
│   ├── stagehand.ts               # Shared Stagehand client helper
│   └── utils.ts                   # cn and general utilities
│
├── middleware.ts                  # Clerk authentication middleware
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 3. Authentication Migration (Better Auth → Clerk)

### Current Better Auth State
- **Library**: `better-auth` v1.7.5 with `@better-auth/react`.
- **Database Adapter**: Defined in `lib/schema.ts` (`users`, `sessions`, `verifications`, `auditLog`). Initialized via SQLite in `scripts/migrate.mjs`.
- **Client Helper**: `lib/auth-client.ts` (`createAuthClient`, exporting `useSession`, `signIn`, `signUp`, `signOut`).
- **Server Handler**: `app/api/auth/[...all]/route.ts`.
- **Route Protection**: Basic `middleware.ts` matching `/dashboard/:path*`, `/test`, but with empty check (`NextResponse.next()`).
- **Client Components**: `components/dashboard/sidebar.tsx` and `components/auth/user-profile.tsx` use `useSession()` and `signOut()`. `components/auth/auth-card.tsx` uses `signIn.email()` and `signUp.email()`.

### Target Clerk State
- **Library**: `@clerk/nextjs` (latest compatible with Next.js 16).
- **Environment**:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
- **Root Provider**: `<ClerkProvider>` wrapping `RootLayout` in `app/layout.tsx`.
- **Middleware**:
  ```ts
  import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

  const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

  export default clerkMiddleware(async (auth, request) => {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
  });

  export const config = {
    matcher: [
      "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
      "/(api|trpc)(.*)",
    ],
  };
  ```
- **Server Authentication**:
  - App Router server actions & route handlers: `const { userId, orgId, orgRole } = await auth();`.
  - Resource verification ensures both `userId` and `orgId` boundaries are met.
- **Client UI**:
  - `UserButton` in sidebar footer and header.
  - `OrganizationSwitcher` in sidebar header.
  - Clean sign-in / sign-up pages using `<SignIn />` and `<SignUp />` styled with shadcn aesthetics.

---

## 4. Organization Migration (Clerk Organizations)

### Current State
- The UI in `components/dashboard/sidebar.tsx` displays a mock organization dropdown ("Bar Inc." and "Personal").
- Workflows in `lib/schema.ts` have no `organizationId` or `userId` column.

### Target State
- Use **Clerk Organizations** as the multi-tenant boundary.
- Workflows will belong to an active organization:
  ```text
  User -> Member of Clerk Organization -> Owns Workflows -> Workflow Executions
  ```
- Workflow Schema Update:
  - Add `organization_id varchar(256) not null` (or nullable for personal scope if permitted).
  - Add `user_id varchar(256) not null` (the workflow creator / author).
- Organization Switching:
  - Integrate Clerk `<OrganizationSwitcher hidePersonal={false} />` into `components/dashboard/sidebar.tsx` and header.
  - Organization switching automatically updates active `orgId`, reloading queries scoped to `eq(workflows.organizationId, orgId)`.
- Roles & Permissions:
  - `org:admin`: Full manage permissions (create, edit, delete, run, invite).
  - `org:member`: View and run workflows.
  - Enforcement happens on the server before mutating or reading workflows.

---

## 5. Workflow Feature Architecture

The workflow code will be encapsulated in `features/workflows/`:
- **Canvas (`features/workflows/components/canvas.tsx`)**: The visual node graph canvas with grid background, node rendering, zoom controls, and collaborator status indicators.
- **Toolbar / Inspector (`features/workflows/components/right-sidebar.tsx`)**: Provides trigger and action palettes ("Start", "Open URL", "Act", "Extract", "Observe", "Agent", "Send Email") and node configuration editor.
- **State & Data (`features/workflows/hooks/use-workflows.tsx` & `features/workflows/data.ts`)**:
  - React hook exposing `workflows`, `selectedWorkflow`, `selectWorkflow`, `createWorkflow`, `runWorkflow`.
  - Backed by Server Actions in `features/workflows/actions.ts` querying Neon Postgres via Drizzle ORM scoped by Clerk `orgId`.
- **Node Definitions (`features/workflows/nodes/definitions.ts`)**:
  - Definition metadata for all KingsFlow nodes (icons, color tags, input/output schemas).
- **Automation Runner (`features/workflows/tasks/runner.ts`)**:
  - Server-side execution pipeline integrating Browserbase and Stagehand for browser automation steps.

---

## 6. Database Migration Plan

### 1. Existing Schema Analysis (`lib/schema.ts`)
- `workflows`: Needs `organization_id` (varchar) and `user_id` (varchar).
- `nodes` & `edges`: Reference `workflows.id`.
- `users`: Can remain as application user metadata synced from Clerk via Webhooks or created on first sign-in.
- `sessions` & `verifications`: Obsolete Better Auth tables. Kept during Phase 1-7, removed in Phase 9 after Clerk verification.
- `audit_log`: Preserved, user_id references Clerk userId.

### 2. Required Modifications
```sql
ALTER TABLE "workflows" ADD COLUMN "organization_id" varchar(256);
ALTER TABLE "workflows" ADD COLUMN "user_id" varchar(256);
CREATE INDEX "workflows_org_idx" ON "workflows" ("organization_id");
```

### 3. Step-by-step Database Rollout
1. Keep existing tables untouched while implementing feature-oriented structure.
2. Update Drizzle schema in `lib/db/schema.ts`.
3. Generate and run migration to add `organization_id` and `user_id` columns to `workflows`.
4. Migrate all data queries to filter on `organization_id`.
5. Only after Clerk is fully operating, retire the Better Auth SQLite/Postgres tables safely.

---

## 7. Execution Checklist & Phases

- [ ] **Phase 1: Blueprint Setup & Linking**
  - Verify Clerk CLI link to `app_3K0YHqLI4h2GzfUrpCbrQPnug6s` and pull development keys.
  - Install `@clerk/nextjs` (and `@clerk/ui` if required for shadcn).
- [ ] **Phase 2: Feature-Oriented File Structure**
  - Create `features/workflows/` and `features/auth/` directory trees.
  - Move workflow canvas, nodes, and sidebar tools to `features/workflows/`.
  - Move auth presentation to `features/auth/`.
  - Re-export and organize shared primitives in `lib/` and `components/`.
- [ ] **Phase 3: Clerk Integration**
  - Add `<ClerkProvider>` to `app/layout.tsx`.
  - Configure `middleware.ts` with `clerkMiddleware`.
  - Implement `/sign-in` and `/sign-up` routes in `app/(auth)/`.
- [ ] **Phase 4: Multi-Tenancy & Clerk Organizations**
  - Replace hardcoded org switcher with Clerk `<OrganizationSwitcher />` styled to match dark UI.
  - Replace avatar menu with `<UserButton />`.
  - Update `actions.ts` and `data.ts` to enforce `await auth()` and `orgId`.
- [ ] **Phase 5: Database Schema Alignment**
  - Add `organizationId` and `userId` to `workflows` table in Drizzle schema.
  - Generate migration and verify queries.
- [ ] **Phase 6: Better Auth Decommissioning**
  - Check for remaining references to `better-auth` and `authClient`.
  - Remove `app/api/auth/[...all]`.
  - Uninstall `better-auth`.
- [ ] **Phase 7: Comprehensive Validation**
  - Run `tsc --noEmit`.
  - Run `npm run lint`.
  - Run `clerk doctor`.
  - Test authentication matrix and create `MIGRATION_REPORT.md`.

# KingsFlow Agent — Comprehensive Implementation Roadmap

**Project:** KingsFlow Agent  
**Repository Directory:** `C:\Users\LOYAL\Desktop\WEB\relay\browser-automation`  
**Date:** November 12, 2026  
**Auditor:** Principal Full-Stack & Systems Infrastructure Engineer  

---

## Overview

This roadmap organizes the technical evolution of KingsFlow Agent across 7 structured phases. It documents the critical fixes already implemented during the reference audit, the missing reference parity capabilities added, and future production, security, and enterprise additions that elevate KingsFlow beyond the reference tutorial project into an enterprise-grade browser automation platform.

---

## Phase 1: Critical Bugs & Broken Functionality (Completed)

*Focus: Eliminate runtime exceptions, broken components, TypeScript compile failures, and execution pipeline disconnects.*

### Task 1.1: Fix WorkflowShell TypeScript Property Failure
- **Status:** **RESOLVED**
- **Files Modified:** `features/workflows/components/workflow-shell.tsx`, `app/(dashboard)/workflows/[id]/page.tsx`
- **Root Cause:** `WorkflowShell` declared a custom `props: { workflow: ... }` signature that passed an unaccepted `workflow` prop to `<Canvas workflow={...} />`, causing error `TS2322: Property 'workflow' does not exist on type 'IntrinsicAttributes'`.
- **Solution Implemented:** Refactored `WorkflowShell` to take `{ workflowId: string }`, passing `workflowId` to `<RightSidebar workflowId={workflowId} />` and rendering `<Canvas />` cleanly. Aligned `page.tsx` to pass `<WorkflowShell workflowId={id} />`.

### Task 1.2: Replace Malformed Session Replay Component
- **Status:** **RESOLVED**
- **Files Modified:** `features/workflows/components/session-replay.tsx`
- **Root Cause:** `session-replay.tsx` contained an accidental duplicate of `Room` from `room.tsx`.
- **Solution Implemented:** Replaced with the complete `SessionReplay` implementation using `hls.js`, polling the `/api/replays/[sessionId]` endpoint with exponential backoff / 202 polling, and handling loading, ready, error, and unsupported browser states.

### Task 1.3: Enable Session Replay in Console Inspector Panel
- **Status:** **RESOLVED**
- **Files Modified:** `features/workflows/components/inspector-panel.tsx`
- **Root Cause:** Lines 28-31 were hardcoded to return `<Note>This recording is no longer available.</Note>`.
- **Solution Implemented:** Connected `SessionReplay` component to `InspectorPanel` when `selection.kind === "replay"`, passing `run.browserbaseSessionId`.

### Task 1.4: Resolve Liveblocks Client Module Initialization
- **Status:** **RESOLVED**
- **Files Modified:** `lib/liveblocks.ts`, `app/(dashboard)/workflows/[id]/page.tsx`
- **Root Cause:** `lib/liveblocks.ts` exported an uninitialized `export let liveblocks: Liveblocks | undefined` variable, causing `page.tsx` line 24 (`if (!liveblocks) throw new Error(...)`) to unconditionally throw.
- **Solution Implemented:** Exported `liveblocks` initialized with `new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY })` when the environment variable is present, providing clear error guidance if missing.

### Task 1.5: Fix Trigger.dev Split-Brain & Organization Parameter Mismatch
- **Status:** **RESOLVED**
- **Files Modified:** `trigger.config.ts`, `features/workflows/actions.ts`, `features/workflows/tasks/run-workflow.ts`
- **Root Cause:** `trigger.config.ts` was pointing only to `./src/trigger`. In `actions.ts`, `tasks.trigger` passed `{ workflowId, organizationId: orgId }`, but `runWorkflowTask` expected `{ workflowId, orgId }`, leading to `undefined` organization lookups. Furthermore, `browserbaseSessionId` was never captured.
- **Solution Implemented:** 
  - Updated `trigger.config.ts` to `dirs: ["features", "./src/trigger"]`.
  - Updated `run-workflow.ts` to accept `{ workflowId, orgId, organizationId }` with fallback `effectiveOrgId = orgId || organizationId`.
  - Captured `stagehand.browserbaseSessionID` and returned it in `{ steps, browserbaseSessionId }`.
  - Updated `actions.ts` to pass `{ workflowId, orgId, organizationId: orgId }`.

---

## Phase 2: Missing Reference Features (Completed)

*Focus: Restore core reference platform features missing from the KingsFlow repository.*

### Task 2.1: Implement Replay Proxy Route with Clerk Pro Gating
- **Status:** **RESOLVED**
- **Files Created:** `app/api/replays/[sessionId]/route.ts`
- **Capabilities:**
  - Authenticates Clerk user and organization.
  - Verifies Pro plan entitlement via `has({ plan: "pro" })`.
  - Emits structured Sentry telemetry.
  - Retrieves page metadata and HLS playlist from Browserbase SDK.
  - Returns HTTP 202 Accepted while video processing is ongoing.
  - Returns HTTP 200 with `application/vnd.apple.mpegurl` when playlist is ready.

### Task 2.2: Implement Liveblocks Collaborator User Resolution
- **Status:** **RESOLVED**
- **Files Created:** `app/api/liveblocks/users/route.ts`
- **Capabilities:**
  - Receives `{ userIds: string[] }`.
  - Calls `clerkClient().users.getUserList()` scoped strictly to the caller's Clerk organization (`organizationId: [orgId]`), preventing multi-tenant user harvesting.
  - Returns resolved array of user display names and avatars for `AvatarStack` rendering.

### Task 2.3: Implement Billing Route (`/billing`)
- **Status:** **RESOLVED**
- **Files Created:** `app/(dashboard)/billing/page.tsx`
- **Capabilities:**
  - Embeds Clerk's official `<PricingTable for="organization" newSubscriptionRedirectUrl="/billing" />`.
  - Provides a destination for all "Upgrade to Pro" callouts and locked Pro features.

### Task 2.4: Implement Organization Selection Route (`/choose-organization`)
- **Status:** **RESOLVED**
- **Files Created:** `app/(auth)/choose-organization/page.tsx`
- **Files Modified:** `app/layout.tsx`
- **Capabilities:**
  - Renders `<TaskChooseOrganization redirectUrlComplete="/" />`.
  - Configures `taskUrls={{ "choose-organization": "/choose-organization" }}` on `<ClerkProvider>` so unassigned users are redirected to select or create an organization.

### Task 2.5: Configure Full-Stack Sentry Observability
- **Status:** **RESOLVED**
- **Files Created:** `app/global-error.tsx`, `instrumentation.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`
- **Capabilities:**
  - Intercepts uncaught root React errors via `GlobalError`.
  - Hooks App Router navigation transitions via `onRouterTransitionStart`.
  - Ingests server-side request errors via `onRequestError`.
  - Safely operates whether Sentry DSN is configured or omitted.

---

## Phase 3: Frontend & Workflow Editor Improvements

*Focus: Polish user experience, responsive behavior, and visual interaction states.*

### Task 3.1: Canvas Resizing & Viewport Boundary Controls
- **Priority:** P2
- **Files to Modify:** `features/workflows/components/canvas.tsx`
- **Work Required:**
  - Add `minZoom={0.2}` and `maxZoom={1.5}` bounds.
  - Implement canvas auto-fit on initial graph load (`fitViewOptions={{ padding: 0.2 }}`).
  - Add keyboard navigation shortcuts (Delete/Backspace for selected nodes/edges, Spacebar to pan).

### Task 3.2: Mobile Responsive Fallbacks for Workflow Editor
- **Priority:** P2
- **Files to Modify:** `features/workflows/components/workflow-shell.tsx`, `hooks/use-mobile.ts`
- **Work Required:**
  - On screens narrower than 768px, convert horizontal resizable split panes into tabbed navigation (Canvas / Logs / Inspector).
  - Add floating drawer for node configuration on touch screens.

### Task 3.3: Rich Step Duration & Performance Formatting
- **Priority:** P3
- **Files to Modify:** `features/workflows/components/logs-panel.tsx`
- **Work Required:**
  - Utilize `pretty-ms` to format execution durations cleanly (`120ms`, `1.4s`, `2m 15s`).
  - Add total run duration badge to the run header row.

---

## Phase 4: Backend & Execution Improvements

*Focus: Enhance graph persistence, error handling, and task execution throughput.*

### Task 4.1: Atomic Workflow Duplication
- **Priority:** P2
- **Files to Modify:** `features/workflows/actions.ts`, `features/workflows/data.ts`
- **Work Required:**
  - Add `duplicateWorkflowAction(id: string)`.
  - Generate a new UUID and clone the existing JSONB graph with new internal node IDs to prevent cross-workflow Liveblocks handle collisions.

### Task 4.2: Workflow Execution Retry Policies & Timeouts
- **Priority:** P2
- **Files to Modify:** `features/workflows/tasks/run-workflow.ts`, `trigger.config.ts`
- **Work Required:**
  - Configure per-node timeout overrides (e.g., allow `agent` up to 180s while limiting `open-url` to 30s).
  - Implement selective retries on network/timeout errors without re-running completed preceding nodes.

### Task 4.3: Secure Variable Interpolation with Escaping
- **Priority:** P2
- **Files to Modify:** `features/workflows/lib/interpolate.ts`
- **Work Required:**
  - Support syntax escaping (`\{\{literal\}\}`) to allow workflows to pass literal curly braces into email bodies or code scripts without triggering variable replacement errors.

---

## Phase 5: External Integrations & Infrastructure

*Focus: Fortify external cloud dependencies and deployment tooling.*

### Task 5.1: Browserbase Session Replay Cache Headers & Error Boundaries
- **Priority:** P2
- **Files to Modify:** `app/api/replays/[sessionId]/route.ts`
- **Work Required:**
  - Add robust HTTP status handling for expired Browserbase sessions (410 Gone vs 404 Not Found vs 202 Processing).
  - Cache `.m3u8` playlist manifests in memory using Next.js unstable_cache or server cache for 60 seconds once complete.

### Task 5.2: Resend Verified Sender Domain Verification
- **Priority:** P2
- **Files to Modify:** `features/workflows/nodes/send-email.ts`, `lib/resend.ts`
- **Work Required:**
  - In non-production environments, default `from` to `onboarding@resend.dev`.
  - In production, validate that `RESEND_FROM_EMAIL` matches the verified domain registered in the Resend account.

### Task 5.3: Production Deployment Scripts
- **Priority:** P2
- **Files to Modify:** `package.json`
- **Work Required:**
  - Add `"trigger:deploy": "npx trigger.dev@latest deploy"` to `package.json` scripts.
  - Document zero-downtime deployment workflows on Railway, Vercel, and Neon.

---

## Phase 6: Security & Production Readiness

*Focus: Zero-trust multi-tenancy, rate limiting, and secret management.*

### Task 6.1: Tenant Quota & Usage Rate Limiting
- **Priority:** P1
- **Files to Modify:** `features/workflows/actions.ts`, `lib/db/schema.ts`
- **Work Required:**
  - Enforce maximum active concurrent workflow runs per organization (e.g., 2 for Free, 10 for Pro).
  - Track monthly execution minute usage in Postgres to prevent runaway Browserbase infrastructure bills.

### Task 6.2: Audit Logging for Sensitive Workflow Actions
- **Priority:** P2
- **Files to Modify:** `lib/db/schema.ts`, `features/workflows/actions.ts`
- **Work Required:**
  - Create `audit_logs` table tracking: `id`, `orgId`, `userId`, `action` (`workflow.created`, `workflow.deleted`, `workflow.run`), `ipAddress`, `createdAt`.
  - Log all deletion and manual run events for compliance.

### Task 6.3: Encrypted Secrets Storage for Custom User Credentials
- **Priority:** P1
- **Files to Modify:** `lib/db/schema.ts`, `lib/crypto.ts`
- **Work Required:**
  - Implement an encrypted credentials table (`organization_secrets`) using AES-256-GCM.
  - Allow organizations to provide custom HTTP headers, proxy credentials, or API tokens injected into Stagehand nodes at execution time without hardcoding in workflow values.

---

## Phase 7: Product Features Beyond the Reference

*Focus: High-value commercial capabilities that differentiate KingsFlow Agent from tutorial projects.*

### Task 7.1: Scheduled & Cron Workflow Automations
- **Priority:** P1
- **Files to Modify:** `lib/db/schema.ts`, `features/workflows/tasks/cron-trigger.ts`
- **Work Required:**
  - Add `schedule` column (cron expression) to `workflows`.
  - Use Trigger.dev `schedules.create` to automatically execute scheduled workflows (e.g., nightly scraping, price monitoring).

### Task 7.2: Webhook Trigger Node
- **Priority:** P1
- **Files to Modify:** `features/workflows/nodes/webhook-trigger.ts`, `app/api/webhooks/workflows/[id]/route.ts`
- **Work Required:**
  - Create a new Trigger node type `webhook-trigger` with unique inbound endpoint and secret signature verification.
  - Allows external platforms (Stripe, GitHub, Zapier, custom backends) to trigger browser automation workflows via HTTP POST.

### Task 7.3: Workflow Templates Library
- **Priority:** P2
- **Files to Modify:** `features/workflows/templates/index.ts`, `components/dashboard/new-workflow-dialog.tsx`
- **Work Required:**
  - Provide pre-built workflow templates:
    1. E-Commerce Product Price Monitor & Email Alert.
    2. Competitor Website Change Detector & Screenshot.
    3. Lead Data Extraction to JSON.
    4. Authenticated SaaS Dashboard Health Checker.

### Task 7.4: Workflow Import & Export (JSON Schema)
- **Priority:** P2
- **Files to Modify:** `features/workflows/components/right-sidebar.tsx`, `features/workflows/lib/validate-graph.ts`
- **Work Required:**
  - Allow users to download workflow definitions as portable JSON files.
  - Allow drag-and-drop workflow JSON importing with schema validation and automatic node ID re-keying.

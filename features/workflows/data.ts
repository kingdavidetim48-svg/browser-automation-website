import { db } from "@/lib/db"
import { workflows } from "@/lib/schema"
import { eq, and, isNull } from "drizzle-orm"
import { auth } from "@clerk/nextjs/server"

export interface WorkflowRecord {
  id: string
  name: string
  description: string | null
  status: "draft" | "active" | "archived"
  triggerType: "webhook" | "schedule" | "manual" | null
  triggerConfig: unknown
  nodes: unknown[]
  edges: unknown[]
  organizationId: string | null
  userId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Retrieves workflows authorized for the current Clerk user/organization.
 * - When orgId is present: returns workflows owned by the organization.
 * - When orgId is null: returns personal workflows (userId matches and organizationId is null).
 */
export async function getWorkflows(): Promise<WorkflowRecord[]> {
  const { userId, orgId } = await auth()
  if (!userId) return []

  if (orgId) {
    const result = await db
      .select()
      .from(workflows)
      .where(eq(workflows.organizationId, orgId))
    return result as WorkflowRecord[]
  }

  const result = await db
    .select()
    .from(workflows)
    .where(and(eq(workflows.userId, userId), isNull(workflows.organizationId)))

  return result as WorkflowRecord[]
}

/**
 * Retrieves a single workflow by ID and validates ownership/organization authorization.
 * Returns null if the workflow does not exist or the requester is unauthorized.
 */
export async function getWorkflowById(workflowId: string): Promise<WorkflowRecord | null> {
  const { userId, orgId } = await auth()
  if (!userId) return null

  const [workflow] = await db
    .select()
    .from(workflows)
    .where(eq(workflows.id, workflowId))

  if (!workflow) return null

  const typedWorkflow = workflow as WorkflowRecord

  // Server-side multi-tenant authorization
  if (orgId) {
    if (typedWorkflow.organizationId !== orgId) {
      return null
    }
  } else {
    if (typedWorkflow.userId !== userId || typedWorkflow.organizationId !== null) {
      return null
    }
  }

  return typedWorkflow
}
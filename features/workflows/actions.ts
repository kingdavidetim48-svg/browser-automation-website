"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/lib/db"
import { workflows } from "@/lib/schema"
import { eq, and, isNull } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { getWorkflowById, getWorkflows, WorkflowRecord } from "./data"
import { executeWorkflow, WorkflowRunResult } from "./tasks/runner"
import type { WorkflowItem } from "./hooks/use-workflows"

/**
 * Server action to retrieve authorized workflows for the current user/organization.
 */
export async function getWorkflowsAction(): Promise<WorkflowItem[]> {
  const list = await getWorkflows()
  return list.map((w) => ({
    id: w.id,
    name: w.name,
    createdAt: w.createdAt instanceof Date ? w.createdAt.toISOString() : String(w.createdAt),
    organizationId: w.organizationId,
  }))
}

/**
 * Server action to create a new workflow.
 * Sets the active Clerk userId and orgId (if in an organization context).
 */
export async function createWorkflowAction(name?: string): Promise<WorkflowRecord> {
  const { userId, orgId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to create a workflow")
  }

  const adjectives = ["swift", "silent", "gentle", "radiant", "clever", "curious", "stellar"]
  const animals = ["falcon", "otter", "badger", "lynx", "orca", "sparrow", "fox"]
  const generatedName =
    name ||
    `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${animals[Math.floor(Math.random() * animals.length)]}`

  const workflowId = `${generatedName}-${crypto.randomUUID().slice(0, 8)}`

  const [newWorkflow] = await db
    .insert(workflows)
    .values({
      id: workflowId,
      name: generatedName,
      organizationId: orgId || null,
      userId,
      status: "draft",
      nodes: [],
      edges: [],
    })
    .returning()

  revalidatePath("/dashboard")
  return newWorkflow as WorkflowRecord
}

/**
 * Server action to update an existing workflow.
 * Verifies server-side authorization before updating.
 */
export async function updateWorkflowAction(
  workflowId: string,
  updates: Partial<{
    name: string
    description: string | null
    status: "draft" | "active" | "archived"
    triggerType: "webhook" | "schedule" | "manual" | null
    triggerConfig: unknown
    nodes: unknown[]
    edges: unknown[]
  }>,
): Promise<WorkflowRecord> {
  const { userId, orgId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to update a workflow")
  }

  // 1. Verify existence & ownership
  const existing = await getWorkflowById(workflowId)
  if (!existing) {
    throw new Error("Forbidden: Workflow not found or not authorized")
  }

  // 2. Strict scoped WHERE condition (defense in depth)
  const condition = orgId
    ? and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId))
    : and(eq(workflows.id, workflowId), eq(workflows.userId, userId), isNull(workflows.organizationId))

  const [updated] = await db
    .update(workflows)
    .set({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.status !== undefined && { status: updates.status }),
      ...(updates.triggerType !== undefined && { triggerType: updates.triggerType }),
      ...(updates.triggerConfig !== undefined && { triggerConfig: updates.triggerConfig }),
      ...(updates.nodes !== undefined && { nodes: updates.nodes }),
      ...(updates.edges !== undefined && { edges: updates.edges }),
      updatedAt: new Date(),
    })
    .where(condition)
    .returning()

  if (!updated) {
    throw new Error("Forbidden: Failed to update workflow")
  }

  revalidatePath("/dashboard")
  return updated as WorkflowRecord
}

/**
 * Server action to delete a workflow.
 * Verifies server-side authorization before deleting.
 */
export async function deleteWorkflowAction(workflowId: string): Promise<{ success: boolean; id: string }> {
  const { userId, orgId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to delete a workflow")
  }

  // 1. Verify existence & ownership
  const existing = await getWorkflowById(workflowId)
  if (!existing) {
    throw new Error("Forbidden: Workflow not found or not authorized")
  }

  // 2. Strict scoped WHERE condition
  const condition = orgId
    ? and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId))
    : and(eq(workflows.id, workflowId), eq(workflows.userId, userId), isNull(workflows.organizationId))

  await db.delete(workflows).where(condition)

  revalidatePath("/dashboard")
  return { success: true, id: workflowId }
}

/**
 * Server action to run a workflow with Browserbase and Stagehand.
 * Enforces server-side authorization and passes the full workflow record.
 */
export async function runWorkflowAction(workflowId: string): Promise<WorkflowRunResult> {
  // 1. Authenticate with Clerk
  const { userId, orgId } = await auth()
  if (!userId) {
    throw new Error("Unauthorized: Please sign in to run this workflow")
  }

  // 2. Retrieve workflow and verify ownership/organization authorization server-side
  const workflow = await getWorkflowById(workflowId)
  if (!workflow) {
    throw new Error("Forbidden: Workflow not found or not authorized")
  }

  // 3. Double-check tenant boundary
  if (orgId) {
    if (workflow.organizationId !== orgId) {
      throw new Error("Forbidden: Workflow does not belong to active organization")
    }
  } else if (workflow.userId !== userId || workflow.organizationId !== null) {
    throw new Error("Forbidden: Workflow does not belong to current user personal workspace")
  }

  // 4. Execute workflow with Browserbase and Stagehand, passing the verified workflow record
  const result = await executeWorkflow(workflow, {
    organizationId: orgId || undefined,
    userId,
  })

  revalidatePath("/dashboard")
  return result
}
"use server"

import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { runWorkflowTask } from "@/src/trigger/run-workflow"
import { liveblocks } from "@/lib/liveblocks"
import {
  createWorkflow,
  deleteWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import type { WorkflowGraph } from "@/lib/db/schema"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "createWorkflowAction",
    orgId,
  })

  const workflow = await createWorkflow(orgId, name)

  Sentry.logger.info("Workflow created", { workflowId: workflow.id, orgId })

  revalidatePath("/workflows", "layout")
  redirect(`/workflows/${workflow.id}`)
}

export async function deleteWorkflowAction(id: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "deleteWorkflowAction",
    orgId,
    workflowId: id,
  })

  const workflow = await deleteWorkflow(orgId, id)

  if (!workflow) {
    Sentry.logger.warn("Workflow delete skipped — not found", {
      workflowId: id,
      orgId,
    })
    throw new Error("Workflow not found")
  }

  // The workflow id doubles as its Liveblocks room id — clean it up too.
  try {
    await liveblocks?.deleteRoom(id)
  } catch (err) {
    Sentry.logger.warn("Liveblocks room deletion failed", {
      workflowId: id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  Sentry.logger.info("Workflow deleted", { workflowId: id, orgId })

  revalidatePath("/workflows", "layout")
  redirect("/")
}

export async function runWorkflowAction(input: {
  id?: string
  workflowId?: string
  graph: WorkflowGraph
}) {
  const { orgId, has } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const effectiveId = (input.id || input.workflowId)?.trim()
  if (!effectiveId) {
    throw new Error("A workflow ID is required to start a workflow run.")
  }

  const graph = input.graph
  if (!graph) {
    throw new Error("Workflow has no saved graph")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "runWorkflowAction",
    orgId,
    workflowId: effectiveId,
  })

  const hasAgentNode = graph.nodes.some((node) => node.data.type === "agent")
  if (hasAgentNode && !has({ plan: "pro" })) {
    Sentry.logger.warn("Workflow run denied — Agent node requires Pro plan", {
      workflowId: effectiveId,
      orgId,
    })
    throw new Error("The Agent node requires the Pro plan.")
  }

  try {
    await saveWorkflowGraph({ orgId, id: effectiveId, graph })
  } catch (error) {
    Sentry.logger.warn("Workflow run blocked — graph validation failed", {
      workflowId: effectiveId,
      orgId,
    })
    throw error
  }

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId: effectiveId, organizationId: orgId },
    { tags: [`workflow:${effectiveId}`] }
  )

  Sentry.logger.info("Workflow run triggered", {
    workflowId: effectiveId,
    orgId,
    runId: handle.id,
    nodeCount: graph.nodes.length,
    hasAgentNode,
  })

  return handle
}

export async function cancelWorkflowRunAction(
  input: string | { workflowId?: string; runId: string }
) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")

  const runId = typeof input === "string" ? input : input.runId

  Sentry.getIsolationScope().setAttributes({
    action: "cancelWorkflowRunAction",
    orgId,
    runId,
  })

  await runs.cancel(runId)

  Sentry.logger.info("Workflow run cancelled", { runId, orgId })
}

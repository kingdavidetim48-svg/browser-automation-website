"use server"

import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"
import type { runWorkflowTask } from "@/src/trigger/run-workflow"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"


import { deleteWorkflowRoom } from "@/lib/liveblocks"
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  renameWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import type { WorkflowGraph } from "@/lib/db/schema"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  if (typeof name !== "string" || !name.trim() || name.trim().length > 256) {
    throw new Error("Workflow name must contain 1 to 256 characters.")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "createWorkflowAction",
    orgId,
  })

  const workflow = await createWorkflow(orgId, name.trim(), {
    nodes: [
      {
        id: "start",
        type: "step",
        position: { x: 80, y: 180 },
        data: { type: "start", kind: "trigger", title: "Start", values: {} },
      },
    ],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  })

  Sentry.logger.info("Workflow created", { workflowId: workflow.id, orgId })

  revalidatePath("/dashboard")
  return workflow
}

export async function listWorkflowsAction() {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  return listWorkflows(orgId)
}

export async function getWorkflowAction(id: string) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  const workflow = await getWorkflow(orgId, id)
  if (!workflow) throw new Error("Workflow not found")
  return workflow
}

export async function saveWorkflowGraphAction({
  id,
  graph,
}: {
  id: string
  graph: WorkflowGraph
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  const workflow = await getWorkflow(orgId, id)
  if (!workflow) throw new Error("Workflow not found")
  await saveWorkflowGraph({ orgId, id, graph })
  revalidatePath("/dashboard")
  revalidatePath(`/workflows/${id}`)
  return { updatedAt: new Date().toISOString() }
}

export async function renameWorkflowAction({
  id,
  name,
}: {
  id: string
  name: string
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  if (typeof name !== "string" || !name.trim() || name.trim().length > 256) {
    throw new Error("Workflow name must contain 1 to 256 characters.")
  }

  const workflow = await renameWorkflow(orgId, id, name.trim())
  revalidatePath("/dashboard")
  revalidatePath(`/workflows/${id}`)
  return workflow
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

  // This editor does not use Liveblocks rooms. Clean up a legacy room when
  // configured, but do not turn a successful database delete into a failure.
  try {
    await deleteWorkflowRoom(id)
  } catch (error) {
    Sentry.logger.warn("Legacy Liveblocks room cleanup failed", {
      workflowId: id,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  Sentry.logger.info("Workflow deleted", { workflowId: id, orgId })

  revalidatePath("/workflows", "layout")
  redirect("/")
}

export async function runWorkflowAction(input: {
  workflowId: string
  graph?: WorkflowGraph
}) {
  const workflowId =
    typeof input?.workflowId === "string" ? input.workflowId.trim() : ""
  const graph = input?.graph
  if (!workflowId) {
    throw new Error("A workflow ID is required to start a workflow run.")
  }
  const { orgId, has } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  // The Agent node is Pro-only. Enforce it here rather than in the run task: the
  // action holds the Clerk session (and has()), while the Trigger.dev task runs
  // with no auth context. has() evaluates the active org, confirmed above.
  Sentry.getIsolationScope().setAttributes({
    action: "runWorkflowAction",
    orgId,
    workflowId,
  })

  const workflow = await getWorkflow(orgId, workflowId)
  if (!workflow) throw new Error("Workflow not found")

  const graphToRun = graph ?? workflow.graph
  if (!graphToRun) throw new Error("Workflow has no saved graph")

  const graphProblems = validateGraph(graphToRun)
  if (graphProblems.length > 0) throw new Error(graphProblems.join(" "))

  const hasAgentNode = graphToRun.nodes.some(
    (node) => node.data.type === "agent"
  )
  if (hasAgentNode && !has({ plan: "pro" })) {
    Sentry.logger.warn("Workflow run denied — Agent node requires Pro plan", {
      workflowId,
      orgId,
    })
    throw new Error("The Agent node requires the Pro plan.")
  }

  try {
    if (graph) await saveWorkflowGraph({ orgId, id: workflowId, graph })
  } catch (error) {
    Sentry.logger.error("Workflow graph could not be persisted before run", {
      workflowId,
      orgId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  const handle = await tasks.trigger<typeof runWorkflowTask>(
    "run-workflow",
    { workflowId, organizationId: orgId },
    { tags: [`workflow:${workflowId}`] }
  )

  Sentry.logger.info("Workflow run triggered", {
    workflowId,
    orgId,
    runId: handle.id,
    nodeCount: graphToRun.nodes.length,
    hasAgentNode,
  })

  return handle
}

export async function cancelWorkflowRunAction({
  workflowId,
  runId,
}: {
  workflowId: string
  runId: string
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  const workflow = await getWorkflow(orgId, workflowId)
  if (!workflow) throw new Error("Workflow not found")
  const run = await runs.retrieve(runId)
  if (!run.tags.includes(`workflow:${workflowId}`))
    throw new Error("Run does not belong to this workflow.")

  Sentry.getIsolationScope().setAttributes({
    action: "cancelWorkflowRunAction",
    orgId,
    runId,
  })

  await runs.cancel(runId)

  Sentry.logger.info("Workflow run cancelled", { runId, orgId })
}

export async function getWorkflowRunStatusAction({
  workflowId,
  runId,
}: {
  workflowId: string
  runId: string
}) {
  const { orgId } = await auth()
  if (!orgId) throw new Error("No active organization")
  const workflow = await getWorkflow(orgId, workflowId)
  if (!workflow) throw new Error("Workflow not found")

  const run = await runs.retrieve(runId)
  if (!run.tags.includes(`workflow:${workflowId}`)) {
    throw new Error("Run does not belong to this workflow.")
  }

  const failedStatuses = [
    "FAILED",
    "CRASHED",
    "SYSTEM_FAILURE",
    "TIMED_OUT",
    "EXPIRED",
    "CANCELED",
  ]
  const terminal = ["COMPLETED", ...failedStatuses].includes(run.status)
  return {
    status:
      run.status === "COMPLETED"
        ? ("completed" as const)
        : failedStatuses.includes(run.status)
          ? ("failed" as const)
          : ["EXECUTING", "WAITING", "DEQUEUED"].includes(run.status)
            ? ("running" as const)
            : ("queued" as const),
    terminal,
    error: run.error?.message,
  }
}

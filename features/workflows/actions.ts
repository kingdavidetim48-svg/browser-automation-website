"use server"

import * as Sentry from "@sentry/nextjs"
import { auth } from "@clerk/nextjs/server"
import { runs, tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import toposort from "toposort"

import type { runWorkflowTask } from "@/src/trigger/run-workflow"
import { liveblocks } from "@/lib/liveblocks"
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  saveWorkflowGraph,
} from "@/features/workflows/data"
import {
  appendExecutionLog,
  createWorkflowExecution,
  getActiveExecutionForWorkflow,
  getWorkflowExecution,
  getWorkflowExecutionByTriggerRunId,
  markRemainingNodesSkipped,
  updateWorkflowExecutionStatus,
} from "@/features/workflows/execution-data"
import { broadcastExecutionUpdate } from "@/features/workflows/lib/broadcast-execution"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
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

const TERMINAL_TRIGGER_STATUSES = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELED",
  "CRASHED",
  "TIMED_OUT",
  "SYSTEM_FAILURE",
  "EXPIRED",
])

export async function runWorkflowAction(input: {
  id?: string
  workflowId?: string
  graph: WorkflowGraph
}) {
  const { userId, orgId, has } = await auth()

  if (!userId || !orgId) {
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

  const existingWorkflow = await getWorkflow(orgId, effectiveId)
  if (!existingWorkflow) {
    throw new Error("Workflow not found")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "runWorkflowAction",
    orgId,
    workflowId: effectiveId,
  })

  const problems = validateGraph(graph, { runnable: true })
  if (problems.length > 0) {
    Sentry.logger.warn("Workflow run blocked — graph validation failed", {
      workflowId: effectiveId,
      orgId,
      problems,
    })
    throw new Error(problems[0])
  }

  const hasAgentNode = graph.nodes.some((node) => node.data.type === "agent")
  if (hasAgentNode && !has({ plan: "pro" })) {
    Sentry.logger.warn("Workflow run denied — Agent node requires Pro plan", {
      workflowId: effectiveId,
      orgId,
    })
    throw new Error("The Agent node requires the Pro plan.")
  }

  // Prevent accidental duplicate execution requests for the same workflow.
  const activeExecution = await getActiveExecutionForWorkflow(orgId, effectiveId)
  if (activeExecution) {
    let stillActive = true
    if (activeExecution.triggerRunId) {
      try {
        const triggerRun = await runs.retrieve(activeExecution.triggerRunId)
        if (TERMINAL_TRIGGER_STATUSES.has(triggerRun.status)) {
          stillActive = false
          const mappedStatus =
            triggerRun.status === "COMPLETED"
              ? "COMPLETED"
              : triggerRun.status === "CANCELED"
                ? "CANCELLED"
                : "FAILED"
          await updateWorkflowExecutionStatus({
            executionId: activeExecution.id,
            orgId,
            status: mappedStatus,
            completedAt: new Date(),
            error:
              mappedStatus === "FAILED"
                ? `Run ended with Trigger.dev status ${triggerRun.status}`
                : undefined,
          })
          await markRemainingNodesSkipped(activeExecution.id)
        }
      } catch {
        // If Trigger.dev lookup fails, treat recent DB record (<5m) as active
        const ageMs = Date.now() - activeExecution.createdAt.getTime()
        if (ageMs > 5 * 60 * 1000) {
          stillActive = false
          await updateWorkflowExecutionStatus({
            executionId: activeExecution.id,
            orgId,
            status: "FAILED",
            completedAt: new Date(),
            error: "Execution timed out before completion.",
          })
          await markRemainingNodesSkipped(activeExecution.id)
        }
      }
    }

    if (stillActive) {
      throw new Error(
        "A workflow execution is already in progress. Wait for it to finish or stop it before starting another run."
      )
    }
  }

  await saveWorkflowGraph({ orgId, id: effectiveId, graph })

  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const connected = new Set(graph.edges.flatMap((e) => [e.source, e.target]))
  const order = toposort
    .array(
      graph.nodes.map((n) => n.id),
      graph.edges.map((e) => [e.source, e.target])
    )
    .filter((id) => connected.has(id))
  const disconnectedIds = graph.nodes
    .map((n) => n.id)
    .filter((id) => !connected.has(id))

  const execution = await createWorkflowExecution({
    workflowId: effectiveId,
    orgId,
    triggerInfo: { type: "manual", triggeredByUserId: userId },
    nodes: [
      ...order.map((nodeId) => {
        const node = byId.get(nodeId)!
        return {
          nodeId,
          nodeType: node.data.type,
          nodeTitle: node.data.title,
          status: "queued" as const,
        }
      }),
      ...disconnectedIds.map((nodeId) => {
        const node = byId.get(nodeId)!
        return {
          nodeId,
          nodeType: node.data.type,
          nodeTitle: node.data.title,
          status: "skipped" as const,
        }
      }),
    ],
  })

  try {
    const handle = await tasks.trigger<typeof runWorkflowTask>(
      "run-workflow",
      {
        executionId: execution.id,
        workflowId: effectiveId,
        organizationId: orgId,
      },
      { tags: [`workflow:${effectiveId}`, `execution:${execution.id}`] }
    )

    await updateWorkflowExecutionStatus({
      executionId: execution.id,
      orgId,
      status: "QUEUED",
      triggerRunId: handle.id,
    })
    await appendExecutionLog({
      executionId: execution.id,
      level: "info",
      eventType: "execution.queued",
      message: `Queued on Trigger.dev (run ${handle.id})`,
      metadata: { triggerRunId: handle.id },
    })
    await broadcastExecutionUpdate(effectiveId, execution.id)

    Sentry.logger.info("Workflow run triggered", {
      workflowId: effectiveId,
      orgId,
      executionId: execution.id,
      runId: handle.id,
      nodeCount: graph.nodes.length,
      hasAgentNode,
    })

    return { executionId: execution.id, id: handle.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await updateWorkflowExecutionStatus({
      executionId: execution.id,
      orgId,
      status: "FAILED",
      error: `Failed to enqueue Trigger.dev task: ${message}`,
      completedAt: new Date(),
    })
    await markRemainingNodesSkipped(execution.id)
    await appendExecutionLog({
      executionId: execution.id,
      level: "error",
      eventType: "execution.failed",
      message: `Failed to enqueue Trigger.dev task: ${message}`,
    })
    await broadcastExecutionUpdate(effectiveId, execution.id)
    throw new Error(`Failed to start workflow execution: ${message}`)
  }
}

export async function cancelWorkflowRunAction(
  input: string | { workflowId?: string; runId?: string; executionId?: string }
) {
  const { userId, orgId } = await auth()
  if (!userId || !orgId) throw new Error("No active organization")

  const executionId =
    typeof input === "string" ? undefined : input.executionId?.trim()
  const runId = typeof input === "string" ? input : input.runId?.trim()

  const execution = executionId
    ? await getWorkflowExecution(orgId, executionId)
    : runId
      ? await getWorkflowExecutionByTriggerRunId(orgId, runId)
      : undefined

  if (!execution) {
    throw new Error("Execution not found for active organization")
  }

  Sentry.getIsolationScope().setAttributes({
    action: "cancelWorkflowRunAction",
    orgId,
    executionId: execution.id,
    runId: execution.triggerRunId ?? runId,
  })

  if (execution.triggerRunId) {
    try {
      await runs.cancel(execution.triggerRunId)
    } catch (err) {
      Sentry.logger.warn("Trigger.dev run cancel warning", {
        runId: execution.triggerRunId,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  await updateWorkflowExecutionStatus({
    executionId: execution.id,
    orgId,
    status: "CANCELLED",
    completedAt: new Date(),
  })
  await markRemainingNodesSkipped(execution.id)
  await appendExecutionLog({
    executionId: execution.id,
    level: "warn",
    eventType: "execution.cancelled",
    message: "Execution cancelled by user",
    metadata: { cancelledByUserId: userId },
  })
  await broadcastExecutionUpdate(execution.workflowId, execution.id)

  Sentry.logger.info("Workflow run cancelled", {
    executionId: execution.id,
    runId: execution.triggerRunId,
    orgId,
  })
}

import toposort from "toposort"
import { logger, metadata, task } from "@trigger.dev/sdk"
import type { DeserializedJson } from "@trigger.dev/core"
import { Stagehand } from "@browserbasehq/stagehand"
import { randomUUID } from "node:crypto"

import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import {
  interpolate,
  type NodeOutputs,
} from "@/features/workflows/lib/interpolate"
import { getWorkflow } from "@/features/workflows/data"
import type { NodeType } from "@/features/workflows/nodes/node-registry"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import type {
  NodeExecutionStatus,
  WorkflowGraph,
} from "@/lib/db/schema"
import {
  appendExecutionLog,
  createWorkflowExecution,
  getWorkflowExecution,
  markRemainingNodesSkipped,
  updateNodeRunState,
  updateWorkflowExecutionStatus,
} from "@/features/workflows/execution-data"
import { broadcastExecutionUpdate } from "@/features/workflows/lib/broadcast-execution"
import { redactSensitiveData, redactString } from "@/features/workflows/lib/redact"

export type RunStep = {
  nodeId: string
  type: NodeType
  title: string
  status: NodeExecutionStatus
  durationMs?: number
  startedAt?: string
  completedAt?: string
  input?: Record<string, unknown>
  output?: unknown
  error?: string
}

export type RunWorkflowPayload = {
  executionId?: string
  workflowId: string
  organizationId?: string
  orgId?: string
}

function parseRunWorkflowPayload(input: unknown): {
  executionId?: string
  workflowId: string
  organizationId: string
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(
      'Invalid run-workflow payload. Expected { "workflowId": "...", "organizationId": "..." }. Start the run from the KingsFlow dashboard.'
    )
  }

  const payload = input as Record<string, unknown>
  const orgValue =
    typeof payload.organizationId === "string" && payload.organizationId.trim()
      ? payload.organizationId.trim()
      : typeof payload.orgId === "string" && payload.orgId.trim()
        ? payload.orgId.trim()
        : ""

  const missing: string[] = []
  if (typeof payload.workflowId !== "string" || !payload.workflowId.trim()) {
    missing.push('"workflowId" (the selected workflow ID)')
  }
  if (!orgValue) {
    missing.push('"organizationId" (the authenticated Clerk organization ID)')
  }
  if (missing.length) {
    throw new Error(
      `Invalid run-workflow payload: missing or invalid ${missing.join(" and ")}. Start the run from the KingsFlow dashboard so it supplies the selected workflow and active organization.`
    )
  }

  return {
    executionId:
      typeof payload.executionId === "string" && payload.executionId.trim()
        ? payload.executionId.trim()
        : undefined,
    workflowId: (payload.workflowId as string).trim(),
    organizationId: orgValue,
  }
}

export const runWorkflowTask = task({
  id: "run-workflow",
  run: async (input: RunWorkflowPayload) => {
    const { executionId: providedExecutionId, workflowId, organizationId } =
      parseRunWorkflowPayload(input)

    const workflow = await getWorkflow(organizationId, workflowId)
    if (!workflow) {
      throw new Error(
        `Workflow ${workflowId} was not found for organization ${organizationId}. Confirm the workflow still exists in the active organization and start it from the KingsFlow dashboard.`
      )
    }

    const graph: WorkflowGraph | null = workflow.graph
    if (!graph) throw new Error(`Workflow ${workflowId} has no saved graph`)
    const { nodes, edges } = graph
    const graphProblems = validateGraph(graph, { runnable: true })
    if (graphProblems.length) {
      const message = graphProblems.join(" ")
      if (providedExecutionId) {
        await updateWorkflowExecutionStatus({
          executionId: providedExecutionId,
          orgId: organizationId,
          status: "FAILED",
          error: message,
          completedAt: new Date(),
        })
        await markRemainingNodesSkipped(providedExecutionId)
        await appendExecutionLog({
          executionId: providedExecutionId,
          level: "error",
          eventType: "execution.failed",
          message: `Validation failed: ${message}`,
        })
        await broadcastExecutionUpdate(workflowId, providedExecutionId)
      }
      throw new Error(message)
    }

    const byId = new Map(nodes.map((n) => [n.id, n]))
    const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
    const order = toposort
      .array(
        nodes.map((n) => n.id),
        edges.map((e) => [e.source, e.target])
      )
      .filter((id) => connected.has(id))

    const disconnectedIds = nodes
      .map((n) => n.id)
      .filter((id) => !connected.has(id))

    const executionId = providedExecutionId ?? randomUUID()
    if (!providedExecutionId) {
      await createWorkflowExecution({
        executionId,
        workflowId,
        orgId: organizationId,
        triggerInfo: { type: "api" },
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
    }

    // Check if execution was already cancelled while queued
    const initialExec = await getWorkflowExecution(organizationId, executionId)
    if (initialExec?.status === "CANCELLED") {
      await markRemainingNodesSkipped(executionId)
      await broadcastExecutionUpdate(workflowId, executionId)
      return { executionId, steps: [], browserbaseSessionId: undefined }
    }

    const executionStartedAt = new Date()
    await updateWorkflowExecutionStatus({
      executionId,
      orgId: organizationId,
      status: "RUNNING",
      startedAt: executionStartedAt,
    })
    await appendExecutionLog({
      executionId,
      level: "info",
      eventType: "execution.started",
      message: `Started workflow "${workflow.name}" (${order.length} steps)`,
      metadata: { totalSteps: order.length },
    })

    logger.log(`Running workflow ${workflow.name}`, {
      executionId,
      steps: order.length,
    })

    const steps: RunStep[] = [
      ...order.map((nodeId) => {
        const node = byId.get(nodeId)!
        return {
          nodeId,
          type: node.data.type,
          title: node.data.title,
          status: "queued" as const,
        }
      }),
      ...disconnectedIds.map((nodeId) => {
        const node = byId.get(nodeId)!
        return {
          nodeId,
          type: node.data.type,
          title: node.data.title,
          status: "skipped" as const,
        }
      }),
    ]

    const publishSteps = () =>
      metadata.set("steps", steps as unknown as DeserializedJson[])

    publishSteps()
    await metadata.flush()
    await broadcastExecutionUpdate(workflowId, executionId)

    let stagehand: Stagehand | undefined
    let browserbaseSessionId: string | undefined
    const getStagehand = async () => {
      if (stagehand) return stagehand
      const apiKey = process.env.BROWSERBASE_API_KEY
      if (!apiKey) throw new Error("BROWSERBASE_API_KEY is not configured")

      stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey,
        projectId: process.env.BROWSERBASE_PROJECT_ID,
        model: { modelName: "auto" },
        disablePino: true,
      })
      await stagehand.init()
      browserbaseSessionId = stagehand.browserbaseSessionID
      return stagehand
    }

    const outputs: NodeOutputs = {}
    let completedCount = 0
    let failedCount = 0

    try {
      for (let i = 0; i < order.length; i++) {
        const currentExec = await getWorkflowExecution(organizationId, executionId)
        if (currentExec?.status === "CANCELLED") {
          for (let j = i; j < order.length; j++) {
            steps[j].status = "skipped"
          }
          await markRemainingNodesSkipped(executionId)
          publishSteps()
          await metadata.flush()
          await broadcastExecutionUpdate(workflowId, executionId)
          return { executionId, steps, browserbaseSessionId }
        }

        const id = order[i]
        const step = steps[i]
        const node = byId.get(id)!
        logger.log(`Running step: ${node.data.title}`)

        const executor = nodeExecutors[node.data.type]
        if (!executor) {
          const now = new Date()
          step.status = "completed"
          step.startedAt = now.toISOString()
          step.completedAt = now.toISOString()
          step.durationMs = 0
          completedCount += 1

          await updateNodeRunState({
            executionId,
            nodeId: id,
            status: "completed",
            startedAt: now,
            completedAt: now,
            durationMs: 0,
          })
          await updateWorkflowExecutionStatus({
            executionId,
            orgId: organizationId,
            completedNodes: completedCount,
          })
          await appendExecutionLog({
            executionId,
            nodeId: id,
            nodeTitle: node.data.title,
            level: "info",
            eventType: "node.completed",
            message: `Trigger "${node.data.title}" completed`,
          })
          publishSteps()
          await broadcastExecutionUpdate(workflowId, executionId)
          continue
        }

        const values = Object.fromEntries(
          Object.entries(node.data.values).map(([key, text]) => [
            key,
            interpolate({ text, outputs }),
          ])
        )
        const safeInput = redactSensitiveData(values)
        const stepStartedAt = new Date()
        const startedMs = Date.now()

        step.status = "running"
        step.startedAt = stepStartedAt.toISOString()
        step.input = safeInput

        await updateNodeRunState({
          executionId,
          nodeId: id,
          status: "running",
          input: safeInput,
          startedAt: stepStartedAt,
        })
        await appendExecutionLog({
          executionId,
          nodeId: id,
          nodeTitle: node.data.title,
          level: "info",
          eventType: "node.started",
          message: `Running "${node.data.title}"`,
        })

        publishSteps()
        await metadata.flush()
        await broadcastExecutionUpdate(workflowId, executionId)

        try {
          const output = await executor({ values, getStagehand })
          outputs[id] = output

          const safeOutput = redactSensitiveData(output)
          const stepCompletedAt = new Date()
          const durationMs = Date.now() - startedMs

          step.status = "completed"
          step.completedAt = stepCompletedAt.toISOString()
          step.durationMs = durationMs
          step.output = safeOutput
          completedCount += 1

          await updateNodeRunState({
            executionId,
            nodeId: id,
            status: "completed",
            output: safeOutput,
            completedAt: stepCompletedAt,
            durationMs,
          })
          await updateWorkflowExecutionStatus({
            executionId,
            orgId: organizationId,
            completedNodes: completedCount,
          })
          await appendExecutionLog({
            executionId,
            nodeId: id,
            nodeTitle: node.data.title,
            level: "info",
            eventType: "node.completed",
            message: `Completed "${node.data.title}" in ${durationMs}ms`,
            metadata: { durationMs },
          })

          publishSteps()
          await broadcastExecutionUpdate(workflowId, executionId)
        } catch (error) {
          const stepCompletedAt = new Date()
          const durationMs = Date.now() - startedMs
          const rawMessage =
            error instanceof Error ? error.message : String(error)
          const safeError = redactString(rawMessage)

          step.status = "failed"
          step.completedAt = stepCompletedAt.toISOString()
          step.durationMs = durationMs
          step.error = safeError
          failedCount += 1

          for (let j = i + 1; j < order.length; j++) {
            steps[j].status = "skipped"
          }

          await updateNodeRunState({
            executionId,
            nodeId: id,
            status: "failed",
            error: safeError,
            completedAt: stepCompletedAt,
            durationMs,
          })
          await markRemainingNodesSkipped(executionId)
          await updateWorkflowExecutionStatus({
            executionId,
            orgId: organizationId,
            status: "FAILED",
            failedNodes: failedCount,
            completedNodes: completedCount,
            error: safeError,
            completedAt: stepCompletedAt,
          })
          await appendExecutionLog({
            executionId,
            nodeId: id,
            nodeTitle: node.data.title,
            level: "error",
            eventType: "node.failed",
            message: `Node "${node.data.title}" failed: ${safeError}`,
            metadata: { durationMs },
          })
          await appendExecutionLog({
            executionId,
            level: "error",
            eventType: "execution.failed",
            message: `Workflow execution failed at "${node.data.title}"`,
          })

          publishSteps()
          await metadata.flush()
          await broadcastExecutionUpdate(workflowId, executionId)
          throw error
        }
      }
    } finally {
      try {
        await stagehand?.close()
      } catch (error) {
        logger.error("Failed to close the Stagehand session", { error })
      }
    }

    const completedAt = new Date()
    await updateWorkflowExecutionStatus({
      executionId,
      orgId: organizationId,
      status: "COMPLETED",
      completedNodes: completedCount,
      failedNodes: failedCount,
      browserbaseSessionId,
      completedAt,
    })
    await appendExecutionLog({
      executionId,
      level: "info",
      eventType: "execution.completed",
      message: `Workflow completed (${completedCount}/${order.length} steps)`,
      metadata: {
        completedNodes: completedCount,
        durationMs: completedAt.getTime() - executionStartedAt.getTime(),
      },
    })
    await broadcastExecutionUpdate(workflowId, executionId)

    return { executionId, steps, browserbaseSessionId }
  },
})

import { and, asc, desc, eq, inArray } from "drizzle-orm"
import { randomUUID } from "node:crypto"

import { db } from "@/lib/db"
import {
  executionLogs,
  executionNodeRuns,
  workflowExecutions,
  type ExecutionLog,
  type ExecutionLogLevel,
  type ExecutionNodeRun,
  type ExecutionStatus,
  type NodeExecutionStatus,
  type TriggerInfo,
  type WorkflowExecution,
} from "@/lib/db/schema"
import { redactSensitiveData, redactString } from "@/features/workflows/lib/redact"

export const ACTIVE_EXECUTION_STATUSES: ExecutionStatus[] = [
  "PENDING",
  "QUEUED",
  "RUNNING",
]

export type ExecutionWithDetails = WorkflowExecution & {
  nodeRuns: ExecutionNodeRun[]
  logs: ExecutionLog[]
}

export async function getActiveExecutionForWorkflow(
  orgId: string,
  workflowId: string
): Promise<WorkflowExecution | undefined> {
  const [active] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.orgId, orgId),
        eq(workflowExecutions.workflowId, workflowId),
        inArray(workflowExecutions.status, ACTIVE_EXECUTION_STATUSES)
      )
    )
    .orderBy(desc(workflowExecutions.createdAt))
    .limit(1)

  return active
}

export async function createWorkflowExecution({
  executionId = randomUUID(),
  workflowId,
  orgId,
  triggerInfo,
  nodes,
}: {
  executionId?: string
  workflowId: string
  orgId: string
  triggerInfo: TriggerInfo
  nodes: Array<{
    nodeId: string
    nodeType: string
    nodeTitle: string
    status: NodeExecutionStatus
  }>
}): Promise<WorkflowExecution> {
  const [execution] = await db
    .insert(workflowExecutions)
    .values({
      id: executionId,
      workflowId,
      orgId,
      status: "PENDING",
      triggerInfo,
      totalNodes: nodes.filter((n) => n.status !== "skipped").length,
      completedNodes: 0,
      failedNodes: 0,
    })
    .returning()

  if (nodes.length > 0) {
    await db.insert(executionNodeRuns).values(
      nodes.map((node) => ({
        id: randomUUID(),
        executionId: execution.id,
        nodeId: node.nodeId,
        nodeType: node.nodeType,
        nodeTitle: node.nodeTitle,
        status: node.status,
      }))
    )
  }

  await appendExecutionLog({
    executionId: execution.id,
    level: "info",
    eventType: "execution.pending",
    message: `Execution ${execution.id} created`,
    metadata: { totalNodes: execution.totalNodes },
  })

  return execution
}

export async function updateWorkflowExecutionStatus({
  executionId,
  orgId,
  status,
  triggerRunId,
  browserbaseSessionId,
  error,
  completedNodes,
  failedNodes,
  startedAt,
  completedAt,
}: {
  executionId: string
  orgId: string
  status?: ExecutionStatus
  triggerRunId?: string
  browserbaseSessionId?: string
  error?: string
  completedNodes?: number
  failedNodes?: number
  startedAt?: Date
  completedAt?: Date
}) {
  const patch: Partial<typeof workflowExecutions.$inferInsert> = {}
  if (status !== undefined) patch.status = status
  if (triggerRunId !== undefined) patch.triggerRunId = triggerRunId
  if (browserbaseSessionId !== undefined)
    patch.browserbaseSessionId = browserbaseSessionId
  if (error !== undefined) patch.error = redactString(error)
  if (completedNodes !== undefined) patch.completedNodes = completedNodes
  if (failedNodes !== undefined) patch.failedNodes = failedNodes
  if (startedAt !== undefined) patch.startedAt = startedAt
  if (completedAt !== undefined) patch.completedAt = completedAt

  const [updated] = await db
    .update(workflowExecutions)
    .set(patch)
    .where(
      and(
        eq(workflowExecutions.id, executionId),
        eq(workflowExecutions.orgId, orgId)
      )
    )
    .returning()

  return updated
}

export async function getWorkflowExecution(
  orgId: string,
  executionId: string
): Promise<WorkflowExecution | undefined> {
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.id, executionId),
        eq(workflowExecutions.orgId, orgId)
      )
    )
  return execution
}

export async function getWorkflowExecutionByTriggerRunId(
  orgId: string,
  triggerRunId: string
): Promise<WorkflowExecution | undefined> {
  const [execution] = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.triggerRunId, triggerRunId),
        eq(workflowExecutions.orgId, orgId)
      )
    )
  return execution
}

export async function updateNodeRunState({
  executionId,
  nodeId,
  status,
  input,
  output,
  error,
  startedAt,
  completedAt,
  durationMs,
}: {
  executionId: string
  nodeId: string
  status: NodeExecutionStatus
  input?: Record<string, unknown>
  output?: unknown
  error?: string
  startedAt?: Date
  completedAt?: Date
  durationMs?: number
}) {
  const patch: Partial<typeof executionNodeRuns.$inferInsert> = { status }
  if (input !== undefined) patch.input = redactSensitiveData(input)
  if (output !== undefined) patch.output = redactSensitiveData(output)
  if (error !== undefined) patch.error = redactString(error)
  if (startedAt !== undefined) patch.startedAt = startedAt
  if (completedAt !== undefined) patch.completedAt = completedAt
  if (durationMs !== undefined) patch.durationMs = durationMs

  await db
    .update(executionNodeRuns)
    .set(patch)
    .where(
      and(
        eq(executionNodeRuns.executionId, executionId),
        eq(executionNodeRuns.nodeId, nodeId)
      )
    )
}

export async function markRemainingNodesSkipped(executionId: string) {
  await db
    .update(executionNodeRuns)
    .set({
      status: "skipped",
      completedAt: new Date(),
    })
    .where(
      and(
        eq(executionNodeRuns.executionId, executionId),
        inArray(executionNodeRuns.status, ["queued", "running"])
      )
    )
}

export async function appendExecutionLog({
  executionId,
  nodeId,
  nodeTitle,
  level,
  eventType,
  message,
  metadata,
}: {
  executionId: string
  nodeId?: string
  nodeTitle?: string
  level: ExecutionLogLevel
  eventType: string
  message: string
  metadata?: Record<string, unknown>
}) {
  await db.insert(executionLogs).values({
    id: randomUUID(),
    executionId,
    nodeId: nodeId ?? null,
    nodeTitle: nodeTitle ?? null,
    level,
    eventType,
    message: redactString(message),
    metadata: metadata ? redactSensitiveData(metadata) : null,
  })
}

export async function listWorkflowExecutionsWithDetails(
  orgId: string,
  workflowId: string,
  limit = 15
): Promise<ExecutionWithDetails[]> {
  const executions = await db
    .select()
    .from(workflowExecutions)
    .where(
      and(
        eq(workflowExecutions.orgId, orgId),
        eq(workflowExecutions.workflowId, workflowId)
      )
    )
    .orderBy(desc(workflowExecutions.createdAt))
    .limit(limit)

  if (executions.length === 0) return []

  const executionIds = executions.map((e) => e.id)

  const [nodeRuns, logs] = await Promise.all([
    db
      .select()
      .from(executionNodeRuns)
      .where(inArray(executionNodeRuns.executionId, executionIds)),
    db
      .select()
      .from(executionLogs)
      .where(inArray(executionLogs.executionId, executionIds))
      .orderBy(asc(executionLogs.createdAt)),
  ])

  const nodeRunsByExec = new Map<string, ExecutionNodeRun[]>()
  for (const nr of nodeRuns) {
    const list = nodeRunsByExec.get(nr.executionId) ?? []
    list.push(nr)
    nodeRunsByExec.set(nr.executionId, list)
  }

  const logsByExec = new Map<string, ExecutionLog[]>()
  for (const log of logs) {
    const list = logsByExec.get(log.executionId) ?? []
    list.push(log)
    logsByExec.set(log.executionId, list)
  }

  return executions.map((exec) => ({
    ...exec,
    nodeRuns: nodeRunsByExec.get(exec.id) ?? [],
    logs: logsByExec.get(exec.id) ?? [],
  }))
}

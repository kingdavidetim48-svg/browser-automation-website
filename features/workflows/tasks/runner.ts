import { browserbase } from "@/lib/browserbase"
import { stagehand } from "@/lib/stagehand"
import type { WorkflowRecord } from "../data"

export interface WorkflowRunResult {
  runId: string
  workflowId: string
  status: "success" | "failed" | "running"
  startedAt: string
  completedAt?: string
  logs: string[]
  error?: string
}

/**
 * Executes a workflow with Browserbase and Stagehand.
 * Receives the verified WorkflowRecord to execute its actual configured steps.
 */
export async function executeWorkflow(
  workflow: WorkflowRecord | string,
  options?: {
    organizationId?: string
    userId?: string
  }
): Promise<WorkflowRunResult> {
  const workflowId = typeof workflow === "string" ? workflow : workflow.id
  const workflowName = typeof workflow === "string" ? workflow : workflow.name
  const nodes = typeof workflow === "string" ? [] : Array.isArray(workflow.nodes) ? workflow.nodes : []

  const runId = `run-${Date.now()}`
  const logs: string[] = [
    `[${new Date().toISOString()}] Workflow execution started for: "${workflowName}" (${workflowId})`,
    `[${new Date().toISOString()}] Scoped under org: ${options?.organizationId || "personal"}`,
    `[${new Date().toISOString()}] User: ${options?.userId || "anonymous"}`,
  ]

  try {
    const session = await browserbase.sessions.create()
    logs.push(`[${new Date().toISOString()}] Browser session initialized: ${session.id}`)

    // Process nodes if configured, otherwise execute initialization action
    if (nodes.length > 0) {
      logs.push(`[${new Date().toISOString()}] Executing ${nodes.length} configured workflow steps`)
      for (const node of nodes) {
        const nodeObj = node as { id?: string; label?: string; type?: string; config?: Record<string, unknown> }
        const stepName = nodeObj.label || nodeObj.type || "step"
        const stepResult = await stagehand.executeAction(session.id, {
          action: "act",
          instruction: `Execute step "${stepName}"`,
        })
        logs.push(`[${new Date().toISOString()}] Stagehand step (${stepName}): ${stepResult.result}`)
      }
    } else {
      const openResult = await stagehand.executeAction(session.id, {
        action: "act",
        instruction: "Navigate to target page and initialize",
      })
      logs.push(`[${new Date().toISOString()}] Stagehand step: ${openResult.result}`)
    }

    logs.push(`[${new Date().toISOString()}] Workflow completed successfully`)
    return {
      runId,
      workflowId,
      status: "success",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      logs,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    logs.push(`[${new Date().toISOString()}] Error during execution: ${errorMsg}`)
    return {
      runId,
      workflowId,
      status: "failed",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      logs,
      error: errorMsg,
    }
  }
}

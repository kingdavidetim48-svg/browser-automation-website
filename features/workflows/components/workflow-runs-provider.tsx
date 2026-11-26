"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useEventListener } from "@liveblocks/react/suspense"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"

import type { RunStep, runWorkflowTask } from "../tasks/run-workflow"
import type {
  ExecutionLog,
  ExecutionNodeRun,
  ExecutionStatus,
  NodeExecutionStatus,
  WorkflowExecution,
} from "@/lib/db/schema"
import type { NodeType } from "@/features/workflows/nodes/node-registry"

type TriggerWorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

export type SerializedExecution = Omit<
  WorkflowExecution,
  "startedAt" | "completedAt" | "createdAt"
> & {
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  nodeRuns: Array<
    Omit<ExecutionNodeRun, "startedAt" | "completedAt"> & {
      startedAt: string | null
      completedAt: string | null
    }
  >
  logs: Array<
    Omit<ExecutionLog, "createdAt"> & {
      createdAt: string
    }
  >
}

export interface ConsoleRun {
  id: string
  triggerRunId: string | null
  status: ExecutionStatus
  createdAt: Date
  startedAt: Date | null
  completedAt: Date | null
  durationMs: number | null
  totalNodes: number
  completedNodes: number
  failedNodes: number
  error: string | null
  isLive: boolean
  steps: RunStep[]
  logs: SerializedExecution["logs"]
  browserbaseSessionId?: string
}

interface WorkflowRunsContextValue {
  executions: ConsoleRun[]
  isLoading: boolean
  error?: Error
  refresh: () => Promise<void>
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | null>(null)

interface WorkflowRunsProviderProps {
  workflowId: string
  accessToken: string
  children: React.ReactNode
}

function isExecutionLive(status: ExecutionStatus): boolean {
  return status === "PENDING" || status === "QUEUED" || status === "RUNNING"
}

function mapTriggerStatus(
  status: TriggerWorkflowRun["status"],
  fallback: ExecutionStatus
): ExecutionStatus {
  switch (status) {
    case "QUEUED":
    case "DELAYED":
    case "PENDING_VERSION":
      return "QUEUED"
    case "EXECUTING":
    case "DEQUEUED":
    case "WAITING":
      return "RUNNING"
    case "COMPLETED":
      return "COMPLETED"
    case "CANCELED":
      return "CANCELLED"
    case "FAILED":
    case "CRASHED":
    case "TIMED_OUT":
    case "SYSTEM_FAILURE":
    case "EXPIRED":
      return "FAILED"
    default:
      return fallback
  }
}

function mapLegacyStepStatus(status: string): NodeExecutionStatus {
  if (status === "pending") return "queued"
  if (status === "done") return "completed"
  if (
    status === "idle" ||
    status === "queued" ||
    status === "running" ||
    status === "completed" ||
    status === "failed" ||
    status === "skipped"
  ) {
    return status
  }
  return "idle"
}

export function WorkflowRunsProvider({
  workflowId,
  accessToken,
  children,
}: WorkflowRunsProviderProps) {
  const { runs: triggerRuns, error } = useRealtimeRunsWithTag<
    typeof runWorkflowTask
  >(`workflow:${workflowId}`, { accessToken })

  const [dbExecutions, setDbExecutions] = useState<SerializedExecution[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const fetchingRef = useRef(false)
  const pendingRefetchRef = useRef(false)

  const refresh = useCallback(async () => {
    if (fetchingRef.current) {
      pendingRefetchRef.current = true
      return
    }
    fetchingRef.current = true
    try {
      do {
        pendingRefetchRef.current = false
        try {
          const res = await fetch(`/api/workflows/${workflowId}/executions`, {
            cache: "no-store",
          })
          if (res.ok) {
            const data = (await res.json()) as {
              executions: SerializedExecution[]
            }
            setDbExecutions(data.executions ?? [])
          }
        } catch {
          // Retain last known executions on transient network error
        }
      } while (pendingRefetchRef.current)
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [workflowId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Real-time synchronization across all connected authenticated Liveblocks sessions
  useEventListener(({ event }) => {
    if (event?.type === "EXECUTION_UPDATED") {
      void refresh()
    }
  })

  // Also refresh persisted execution logs/details when Trigger.dev run state advances
  const triggerSignature = useMemo(
    () =>
      triggerRuns
        .map(
          (r) =>
            `${r.id}:${r.status}:${
              Array.isArray(r.metadata?.steps) ? r.metadata.steps.length : 0
            }`
        )
        .join("|"),
    [triggerRuns]
  )

  useEffect(() => {
    if (triggerRuns.length > 0) {
      void refresh()
    }
  }, [triggerSignature, triggerRuns.length, refresh])

  const executions = useMemo<ConsoleRun[]>(() => {
    const triggerByRunId = new Map(triggerRuns.map((r) => [r.id, r]))

    return dbExecutions.map((exec) => {
      const triggerRun = exec.triggerRunId
        ? triggerByRunId.get(exec.triggerRunId)
        : undefined

      const dbSteps: RunStep[] = exec.nodeRuns.map((nr) => ({
        nodeId: nr.nodeId,
        type: nr.nodeType as NodeType,
        title: nr.nodeTitle,
        status: nr.status,
        durationMs: nr.durationMs ?? undefined,
        startedAt: nr.startedAt ?? undefined,
        completedAt: nr.completedAt ?? undefined,
        input: nr.input ?? undefined,
        output: nr.output ?? undefined,
        error: nr.error ?? undefined,
      }))

      const triggerStepsRaw =
        triggerRun?.output?.steps ??
        (triggerRun?.metadata?.steps as RunStep[] | undefined)

      // Merge live Trigger.dev step updates onto persisted DB node runs
      const triggerStepMap = new Map(
        (triggerStepsRaw ?? []).map((s) => [s.nodeId, s])
      )
      const mergedSteps: RunStep[] =
        dbSteps.length > 0
          ? dbSteps.map((dbStep) => {
              const liveStep = triggerStepMap.get(dbStep.nodeId)
              if (!liveStep) return dbStep
              const liveStatus = mapLegacyStepStatus(liveStep.status)
              // Prefer terminal DB status if execution already finished
              const useDb = !isExecutionLive(exec.status)
              return {
                ...dbStep,
                status: useDb ? dbStep.status : liveStatus,
                durationMs: dbStep.durationMs ?? liveStep.durationMs,
                startedAt: dbStep.startedAt ?? liveStep.startedAt,
                completedAt: dbStep.completedAt ?? liveStep.completedAt,
                input: dbStep.input ?? liveStep.input,
                output: dbStep.output ?? liveStep.output,
                error: dbStep.error ?? liveStep.error,
              }
            })
          : (triggerStepsRaw ?? []).map((s) => ({
              ...s,
              status: mapLegacyStepStatus(s.status),
            }))

      const status =
        triggerRun && isExecutionLive(exec.status)
          ? mapTriggerStatus(triggerRun.status, exec.status)
          : exec.status

      const createdAt = new Date(exec.createdAt)
      const startedAt = exec.startedAt ? new Date(exec.startedAt) : null
      const completedAt = exec.completedAt ? new Date(exec.completedAt) : null
      const durationMs =
        startedAt && completedAt
          ? Math.max(0, completedAt.getTime() - startedAt.getTime())
          : null

      return {
        id: exec.id,
        triggerRunId: exec.triggerRunId,
        status,
        createdAt,
        startedAt,
        completedAt,
        durationMs,
        totalNodes: exec.totalNodes || mergedSteps.length,
        completedNodes:
          mergedSteps.filter((s) => s.status === "completed").length ||
          exec.completedNodes,
        failedNodes:
          mergedSteps.filter((s) => s.status === "failed").length ||
          exec.failedNodes,
        error: exec.error,
        isLive: isExecutionLive(status),
        steps: mergedSteps,
        logs: exec.logs ?? [],
        browserbaseSessionId:
          exec.browserbaseSessionId ??
          triggerRun?.output?.browserbaseSessionId ??
          undefined,
      }
    })
  }, [dbExecutions, triggerRuns])

  const value = useMemo<WorkflowRunsContextValue>(
    () => ({ executions, isLoading, error, refresh }),
    [executions, isLoading, error, refresh]
  )

  return (
    <WorkflowRunsContext.Provider value={value}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

function useWorkflowRuns() {
  const ctx = useContext(WorkflowRunsContext)
  if (!ctx) {
    throw new Error(
      "useWorkflowRuns must be used within a WorkflowRunsProvider"
    )
  }
  return ctx
}

export function useWorkflowExecutionState() {
  const { executions, isLoading, error, refresh } = useWorkflowRuns()
  const latestExecution = executions[0]
  const activeExecution = executions.find((e) => e.isLive)
  return {
    executions,
    latestExecution,
    activeExecution,
    isLoading,
    error,
    refresh,
  }
}

export function useLatestRunSteps(): {
  steps: RunStep[]
  isLive: boolean
  execution?: ConsoleRun
} {
  const { executions } = useWorkflowRuns()

  return useMemo(() => {
    const latest = executions[0]
    if (!latest) return { steps: [], isLive: false, execution: undefined }
    return {
      steps: latest.steps,
      isLive: latest.isLive,
      execution: latest,
    }
  }, [executions])
}

export function useLiveRun(): ConsoleRun | undefined {
  const { executions } = useWorkflowRuns()
  return useMemo(() => executions.find((e) => e.isLive), [executions])
}

export function useConsoleRuns(): ConsoleRun[] {
  const { executions } = useWorkflowRuns()
  return executions
}

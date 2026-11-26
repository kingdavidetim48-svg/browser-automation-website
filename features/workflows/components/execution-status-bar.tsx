"use client"

import prettyMilliseconds from "pretty-ms"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useWorkflowExecutionState } from "@/features/workflows/components/workflow-runs-provider"

export function ExecutionStatusBar() {
  const { latestExecution } = useWorkflowExecutionState()

  if (!latestExecution) {
    return (
      <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-3.5 py-1.5 text-[11px] text-muted-foreground">
        <span>Ready to execute workflow</span>
        <span className="font-mono text-[10px]">No runs yet</span>
      </div>
    )
  }

  const total = latestExecution.totalNodes || latestExecution.steps.length
  const completedCount = latestExecution.steps.filter(
    (s) => s.status === "completed"
  ).length
  const runningCount = latestExecution.isLive
    ? latestExecution.steps.filter((s) => s.status === "running").length
    : 0
  const failedCount = latestExecution.steps.filter(
    (s) => s.status === "failed"
  ).length
  const skippedCount = latestExecution.steps.filter(
    (s) => s.status === "skipped"
  ).length

  const settledCount = completedCount + failedCount + skippedCount
  const progressPct =
    total > 0
      ? Math.min(100, Math.round((settledCount / total) * 100))
      : latestExecution.status === "COMPLETED"
        ? 100
        : 0

  return (
    <div
      data-testid="execution-status-bar"
      className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-muted/25 px-3.5 py-1.5 text-[11px]"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
            latestExecution.status === "COMPLETED" &&
              "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
            latestExecution.status === "FAILED" &&
              "bg-destructive/10 text-destructive border-destructive/25",
            latestExecution.status === "CANCELLED" &&
              "bg-amber-500/10 text-amber-500 border-amber-500/25",
            latestExecution.isLive &&
              "bg-blue-500/10 text-blue-500 border-blue-500/25"
          )}
        >
          {latestExecution.isLive && (
            <Loader2 className="size-2.5 animate-spin" />
          )}
          {latestExecution.status === "COMPLETED" && (
            <CheckCircle2 className="size-2.5" />
          )}
          {latestExecution.status === "FAILED" && (
            <AlertCircle className="size-2.5" />
          )}
          {latestExecution.status === "CANCELLED" && (
            <XCircle className="size-2.5" />
          )}
          {latestExecution.status}
        </span>

        <span
          title={`Execution ID: ${latestExecution.id}`}
          className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]"
        >
          #{latestExecution.id.slice(0, 8)}
        </span>

        {latestExecution.startedAt && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-2.5" />
            {latestExecution.startedAt.toLocaleTimeString()}
          </span>
        )}

        {latestExecution.completedAt && (
          <span className="hidden md:inline text-[10px] text-muted-foreground">
            → {latestExecution.completedAt.toLocaleTimeString()}
          </span>
        )}

        {latestExecution.durationMs != null && (
          <span className="rounded bg-background/70 px-1.5 py-0.5 font-mono text-[10px] text-foreground border border-border/60">
            {prettyMilliseconds(latestExecution.durationMs)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            {completedCount}/{total} done
          </span>
          {runningCount > 0 && (
            <span className="text-blue-500 font-medium">
              {runningCount} running
            </span>
          )}
          {failedCount > 0 && (
            <span className="text-destructive font-medium">
              {failedCount} failed
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full transition-all duration-300",
                latestExecution.status === "FAILED"
                  ? "bg-destructive"
                  : latestExecution.status === "COMPLETED"
                    ? "bg-emerald-500"
                    : "bg-blue-500"
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground w-7 text-right">
            {progressPct}%
          </span>
        </div>
      </div>
    </div>
  )
}

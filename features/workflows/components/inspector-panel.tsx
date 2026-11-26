"use client"

import prettyMilliseconds from "pretty-ms"

import { cn } from "@/lib/utils"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import { SessionReplay } from "@/features/workflows/components/session-replay"
import { useConsoleRuns } from "@/features/workflows/components/workflow-runs-provider"
import type { ConsoleSelection } from "@/features/workflows/components/logs-panel"

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
      {children}
    </div>
  )
}

export function InspectorPanel({ selection }: { selection: ConsoleSelection }) {
  const runs = useConsoleRuns()
  const run = runs.find((r) => r.id === selection.runId)

  if (selection.kind === "replay") {
    if (!run?.browserbaseSessionId) {
      return <Note>This recording is no longer available.</Note>
    }
    return <SessionReplay sessionId={run.browserbaseSessionId} />
  }

  const step = run?.steps.find((s) => s.nodeId === selection.nodeId)
  if (!step) return <Note>This step is no longer available.</Note>

  const effectiveStatus =
    !run?.isLive && (step.status === "running" || step.status === "queued")
      ? "skipped"
      : step.status

  return (
    <div
      data-testid="node-execution-inspector"
      className="flex size-full flex-col bg-card/30"
    >
      <div className="flex items-center gap-2 border-b border-border/80 bg-card/70 px-3 py-2">
        <NodeIcon
          type={step.type}
          running={effectiveStatus === "running"}
          className="size-5"
        />
        <span className="truncate text-xs font-semibold text-foreground">
          {step.title}
        </span>
        <span
          className={cn(
            "ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border",
            effectiveStatus === "completed" &&
            "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
            effectiveStatus === "failed" &&
            "bg-destructive/10 text-destructive border-destructive/20",
            effectiveStatus === "running" &&
            "bg-blue-500/10 text-blue-500 border-blue-500/20",
            effectiveStatus === "queued" &&
            "bg-amber-500/10 text-amber-500 border-amber-500/20",
            effectiveStatus === "skipped" &&
            "bg-muted text-muted-foreground border-border"
          )}
        >
          {effectiveStatus}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 border-b border-border/60 bg-muted/15 px-3 py-1.5 text-[10px]">
        <div>
          <span className="text-muted-foreground block">Started</span>
          <span className="font-mono text-foreground">
            {step.startedAt
              ? new Date(step.startedAt).toLocaleTimeString()
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Completed</span>
          <span className="font-mono text-foreground">
            {step.completedAt
              ? new Date(step.completedAt).toLocaleTimeString()
              : "—"}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block">Duration</span>
          <span className="font-mono text-foreground">
            {step.durationMs != null ? prettyMilliseconds(step.durationMs) : "—"}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3 space-y-3">
        {step.error && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive">
              Error
            </span>
            <pre className="overflow-auto whitespace-pre-wrap break-words rounded-md border border-destructive/30 bg-destructive/5 p-2.5 font-mono text-xs text-destructive">
              {step.error}
            </pre>
          </div>
        )}

        {step.input !== undefined && (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Input Data
            </span>
            <pre className="overflow-auto rounded-md border border-border/60 bg-background/60 p-2.5 font-mono text-[11px] leading-relaxed text-foreground/90">
              {JSON.stringify(step.input, null, 2)}
            </pre>
          </div>
        )}

        {step.output !== undefined ? (
          <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Output Data
            </span>
            <pre className="overflow-auto rounded-md border border-border/60 bg-background/60 p-2.5 font-mono text-[11px] leading-relaxed text-foreground/90 selection:bg-primary/20">
              {JSON.stringify(step.output, null, 2)}
            </pre>
          </div>
        ) : !step.error ? (
          <div className="rounded-md border border-border/50 bg-muted/20 p-3 text-center text-xs text-muted-foreground">
            {effectiveStatus === "queued"
              ? "This step is queued and waiting to run."
              : effectiveStatus === "running"
                ? "Waiting for this step to finish…"
                : effectiveStatus === "skipped"
                  ? "This step was skipped."
                  : "This step produced no output."}
          </div>
        ) : null}
      </div>
    </div>
  )
}

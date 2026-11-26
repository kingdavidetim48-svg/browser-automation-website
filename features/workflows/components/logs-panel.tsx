"use client"

import { useState } from "react"
import prettyMilliseconds from "pretty-ms"
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  MonitorPlay,
  SkipForward,
  Terminal,
} from "lucide-react"

import { cn } from "@/lib/utils"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"
import {
  useConsoleRuns,
  type ConsoleRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

export interface StepSelection {
  kind: "step"
  runId: string
  nodeId: string
}

export interface ReplaySelection {
  kind: "replay"
  runId: string
}

export type ConsoleSelection = StepSelection | ReplaySelection

function StepStatusBadge({
  status,
  isLive,
}: {
  status: RunStep["status"]
  isLive: boolean
}) {
  const effective =
    !isLive && (status === "running" || status === "queued") ? "skipped" : status

  if (effective === "completed") {
    return <CheckCircle2 className="size-3.5 shrink-0 text-emerald-500" />
  }
  if (effective === "failed") {
    return <AlertCircle className="size-3.5 shrink-0 text-destructive" />
  }
  if (effective === "queued") {
    return <Clock className="size-3.5 shrink-0 text-amber-500" />
  }
  if (effective === "skipped") {
    return <SkipForward className="size-3.5 shrink-0 text-muted-foreground" />
  }
  return null
}

function StepRow({
  run,
  step,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  step: RunStep
  isSelected: boolean
  onSelect: (selection: StepSelection) => void
}) {
  const isRunning = step.status === "running" && run.isLive
  const isFailed = step.status === "failed"
  const isInactive = step.status === "queued" || step.status === "skipped"

  return (
    <button
      type="button"
      onClick={() =>
        onSelect({ kind: "step", runId: run.id, nodeId: step.nodeId })
      }
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
        isSelected && "bg-accent font-medium text-accent-foreground shadow-xs",
        isInactive && "opacity-65"
      )}
    >
      <NodeIcon type={step.type} running={isRunning} />
      <span
        className={cn(
          "truncate font-medium text-foreground",
          isFailed && "text-destructive font-semibold"
        )}
      >
        {step.title}
      </span>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {step.durationMs != null && (
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {prettyMilliseconds(step.durationMs)}
          </span>
        )}
        <StepStatusBadge status={step.status} isLive={run.isLive} />
      </div>
    </button>
  )
}

function ReplayRow({
  run,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  isSelected: boolean
  onSelect: (selection: ReplaySelection) => void
}) {
  const { isLoaded, isPro, goToUpgrade } = useProPlan()
  const isLocked = isLoaded && !isPro

  return (
    <button
      type="button"
      onClick={() =>
        isLocked ? goToUpgrade() : onSelect({ kind: "replay", runId: run.id })
      }
      title={isLocked ? "Upgrade to Pro to watch replays" : undefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
        isSelected && "bg-accent font-medium text-accent-foreground shadow-xs"
      )}
    >
      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <MonitorPlay className="size-3.5" />
      </span>
      <span className="truncate font-medium">Replay Recording</span>
      {isLocked && (
        <Lock className="ml-auto size-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  )
}

function RunCard({
  run,
  defaultExpanded,
  selected,
  onSelect,
}: {
  run: ConsoleRun
  defaultExpanded: boolean
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
}) {
  const [showEvents, setShowEvents] = useState(defaultExpanded)

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-1.5">
      <div className="flex items-center justify-between gap-2 px-1.5 py-1 text-[11px] font-medium text-muted-foreground">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              run.status === "COMPLETED" && "bg-emerald-500",
              run.status === "FAILED" && "bg-destructive",
              run.status === "CANCELLED" && "bg-amber-500",
              run.isLive && "bg-blue-500 animate-pulse"
            )}
          />
          <span className="font-mono text-[11px]">
            {run.createdAt.toLocaleTimeString()}
          </span>
          <span
            title={`Execution ID: ${run.id}`}
            className="font-mono text-[10px] text-muted-foreground/80 truncate"
          >
            #{run.id.slice(0, 8)}
          </span>
          {run.durationMs != null && (
            <span className="font-mono text-[10px] text-muted-foreground">
              ({prettyMilliseconds(run.durationMs)})
            </span>
          )}
        </div>
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0",
            run.status === "COMPLETED" &&
            "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
            run.status === "FAILED" &&
            "bg-destructive/10 text-destructive border border-destructive/20",
            run.status === "CANCELLED" &&
            "bg-amber-500/10 text-amber-500 border border-amber-500/20",
            run.isLive &&
            "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          )}
        >
          {run.status}
        </span>
      </div>

      {run.error && (
        <div className="mx-1.5 rounded border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
          {run.error}
        </div>
      )}

      <div className="flex flex-col gap-0.5">
        {run.steps.map((step) => (
          <StepRow
            key={step.nodeId}
            run={run}
            step={step}
            isSelected={
              selected?.kind === "step" &&
              selected.runId === run.id &&
              selected.nodeId === step.nodeId
            }
            onSelect={onSelect}
          />
        ))}
        {run.browserbaseSessionId && !run.isLive && (
          <ReplayRow
            run={run}
            isSelected={
              selected?.kind === "replay" && selected.runId === run.id
            }
            onSelect={onSelect}
          />
        )}
      </div>

      {run.logs.length > 0 && (
        <div className="mt-1 border-t border-border/50 pt-1">
          <button
            type="button"
            onClick={() => setShowEvents((v) => !v)}
            className="flex w-full items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
          >
            {showEvents ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            Event Log ({run.logs.length})
          </button>
          {showEvents && (
            <div className="mt-1 flex max-h-36 flex-col gap-0.5 overflow-y-auto px-1.5 pb-1 font-mono text-[10px]">
              {run.logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 rounded px-1 py-0.5",
                    log.level === "error" && "bg-destructive/10 text-destructive",
                    log.level === "warn" && "bg-amber-500/10 text-amber-500",
                    log.level === "info" && "text-muted-foreground"
                  )}
                >
                  <span className="shrink-0 opacity-75">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                  <span className="shrink-0 rounded bg-muted/60 px-1 text-[9px] text-foreground/80">
                    {log.eventType}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-foreground/90">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LogsPanel({
  selected,
  onSelect,
}: {
  selected: ConsoleSelection | null
  onSelect: (selection: ConsoleSelection) => void
}) {
  const runs = useConsoleRuns()

  if (runs.length === 0) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-2.5 p-6 text-center">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-muted/40 text-muted-foreground shadow-xs">
          <Terminal className="size-4" />
        </div>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-foreground">
            No execution history
          </p>
          <p className="text-xs text-muted-foreground">
            Click <span className="font-semibold text-foreground">Run</span> in
            the toolbar to execute this workflow
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col gap-2.5 overflow-y-auto p-2.5">
      {runs.map((run, index) => (
        <RunCard
          key={run.id}
          run={run}
          defaultExpanded={index === 0}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

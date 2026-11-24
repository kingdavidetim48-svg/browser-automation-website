"use client"

import prettyMilliseconds from "pretty-ms"
import { Lock, MonitorPlay, Terminal } from "lucide-react"

import { cn } from "@/lib/utils"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"
import {
  useConsoleRuns,
  type ConsoleRun,
} from "@/features/workflows/components/workflow-runs-provider"
import type { RunStep } from "@/features/workflows/tasks/run-workflow"

// A step is identified across the whole console by which run it belongs to and
// which node it is — the same node id recurs across runs, so both are needed.
export interface StepSelection {
  kind: "step"
  runId: string
  nodeId: string
}

// The replay of a whole run, not a single step — identified by its run alone.
export interface ReplaySelection {
  kind: "replay"
  runId: string
}

// What the console can have selected: one step's output, or one run's replay.
// Only one is active at a time.
export type ConsoleSelection = StepSelection | ReplaySelection

// One step row: the node's icon, its title, and how long it took. It spins while
// running, reads red when it failed, and dims when it never ran. Clicking it
// toggles selection via the ConsolePanel above.
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
  // Only spin while the run is actually live — a step left "running" by a run
  // that has since ended should stop rather than hang forever.
  const isRunning = step.status === "running" && run.isLive
  const isFailed = step.status === "failed"
  const isInactive = step.status === "pending"

  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: "step", runId: run.id, nodeId: step.nodeId })}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60",
        isSelected && "bg-accent font-medium text-accent-foreground shadow-xs",
        isInactive && "opacity-50"
      )}
    >
      <NodeIcon type={step.type} running={isRunning} />
      <span className={cn("truncate font-medium text-foreground", isFailed && "text-destructive font-semibold")}>
        {step.title}
      </span>
      {step.durationMs != null && (
        <span className="ml-auto shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {prettyMilliseconds(step.durationMs)}
        </span>
      )}
    </button>
  )
}

// The replay row for a finished run: it sits with the step rows and selects the
// same way, but it stands for the whole run's recording rather than one step.
function ReplayRow({
  run,
  isSelected,
  onSelect,
}: {
  run: ConsoleRun
  isSelected: boolean
  onSelect: (selection: ReplaySelection) => void
}) {
  // Watching a recording is a Pro feature. Wait for `isLoaded` so a Pro org
  // never flashes a locked state on mount.
  const { isLoaded, isPro, goToUpgrade } = useProPlan()
  const isLocked = isLoaded && !isPro

  return (
    <button
      type="button"
      // Locked rows send the user to upgrade instead of opening the recording.
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

// The list of runs, newest first, each with its steps below it. Reads the shared
// realtime run history and reports step clicks up to the ConsolePanel, which owns
// the selection.
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
          <p className="text-xs font-semibold text-foreground">No execution history</p>
          <p className="text-xs text-muted-foreground">
            Click <span className="font-semibold text-foreground">Run</span> in the toolbar to execute this workflow
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex size-full flex-col gap-2.5 overflow-y-auto p-2.5">
      {runs.map((run) => (
        <div key={run.id} className="flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-1.5">
          <div className="flex items-center justify-between px-1.5 py-1 text-[11px] font-medium text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "size-2 rounded-full",
                run.status === "COMPLETED" && "bg-emerald-500",
                run.status === "FAILED" && "bg-destructive",
                run.isLive && "bg-blue-500 animate-pulse"
              )} />
              <span className="font-mono text-[11px]">{run.createdAt.toLocaleTimeString()}</span>
            </div>
            <span className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              run.status === "COMPLETED" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
              run.status === "FAILED" && "bg-destructive/10 text-destructive border border-destructive/20",
              run.isLive && "bg-blue-500/10 text-blue-400 border border-blue-500/20"
            )}>
              {run.status}
            </span>
          </div>
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
            {/* A recording only exists once the run has finished — its session id
                is present and it's no longer live. */}
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
        </div>
      ))}
    </div>
  )
}
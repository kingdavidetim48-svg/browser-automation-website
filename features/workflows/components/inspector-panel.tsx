"use client"

import { NodeIcon } from "@/features/workflows/components/node-icon"
import { SessionReplay } from "@/features/workflows/components/session-replay"
import {
  useConsoleRuns,
} from "@/features/workflows/components/workflow-runs-provider"
import type { ConsoleSelection } from "@/features/workflows/components/logs-panel"

// A short, centered note for when there's nothing concrete to show.
function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-full items-center justify-center p-3 text-center text-xs text-muted-foreground">
      {children}
    </div>
  )
}

// The output pane for whatever the logs have selected: a step's output, or a
// whole run's session replay. It re-reads the shared run history so a
// still-running step's output appears the moment it lands, without a re-select.
export function InspectorPanel({ selection }: { selection: ConsoleSelection }) {
  const runs = useConsoleRuns()
  const run = runs.find((r) => r.id === selection.runId)

  // A run's replay stands for the whole session — play it instead of any step.
  if (selection.kind === "replay") {
    if (!run?.browserbaseSessionId) {
      return <Note>This recording is no longer available.</Note>
    }
    return <SessionReplay sessionId={run.browserbaseSessionId} />
  }

  const step = run?.steps.find((s) => s.nodeId === selection.nodeId)

  // The selected step can vanish if its run drops out of the realtime window.
  if (!step) return <Note>This step is no longer available.</Note>

  return (
    <div className="flex size-full flex-col bg-card/30">
      <div className="flex items-center gap-2 border-b border-border/80 bg-card/70 px-3 py-2">
        <NodeIcon type={step.type} className="size-5" />
        <span className="truncate text-xs font-semibold text-foreground">{step.title}</span>
        <span className="ml-auto rounded bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          Output
        </span>
      </div>
      {step.error ? (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words bg-destructive/5 p-3 font-mono text-xs text-destructive">
          {step.error}
        </pre>
      ) : step.output !== undefined ? (
        <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-foreground/90 selection:bg-primary/20">
          {JSON.stringify(step.output, null, 2)}
        </pre>
      ) : step.status === "pending" ? (
        <Note>This step hasn&apos;t run yet.</Note>
      ) : step.status === "running" ? (
        <Note>Waiting for this step to finish…</Note>
      ) : (
        <Note>This step produced no output.</Note>
      )}
    </div>
  )
}

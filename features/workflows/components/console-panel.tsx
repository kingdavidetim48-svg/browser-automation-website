"use client"

import { useState } from "react"
import { Terminal } from "lucide-react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { InspectorPanel } from "@/features/workflows/components/inspector-panel"
import {
  LogsPanel,
  type ConsoleSelection,
} from "@/features/workflows/components/logs-panel"

// True when two selections point at the same thing — same kind, same run, and
// for a step the same node. Clicking the active selection again clears it.
function isSameSelection(a: ConsoleSelection, b: ConsoleSelection) {
  if (a.kind !== b.kind) return false
  if (a.runId !== b.runId) return false
  return a.kind === "step" && b.kind === "step" ? a.nodeId === b.nodeId : true
}

// The run console below the canvas. It owns what's selected: the logs on the
// left drive the selection, and the InspectorPanel on the right shows either the
// selected step's output or the selected run's replay. Clicking the active
// selection again clears it.
export function ConsolePanel() {
  const [selected, setSelected] = useState<ConsoleSelection | null>(null)

  const toggle = (selection: ConsoleSelection) => {
    setSelected((prev) =>
      prev && isSameSelection(prev, selection) ? null : selection
    )
  }

  return (
    <div className="flex size-full flex-col bg-card/60 backdrop-blur-xs">
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-3.5 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide text-foreground">Console</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Execution & Replays</span>
      </div>
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="size-full">
          <ResizablePanel defaultSize={selected ? "55%" : "100%"} minSize="200px">
            <LogsPanel selected={selected} onSelect={toggle} />
          </ResizablePanel>
          {selected && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="45%" minSize="240px">
                <InspectorPanel selection={selected} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

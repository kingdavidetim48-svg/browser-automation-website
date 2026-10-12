"use client"

import { useState } from "react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { LogsPanel, type ConsoleSelection } from "./logs-panel"

function InspectorPanel({ selection }: { selection: ConsoleSelection }) {
  return (
    <div className="h-full overflow-auto p-4">
      <pre className="whitespace-pre-wrap text-sm">
        {JSON.stringify(selection, null, 2)}
      </pre>
    </div>
  )
}

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
    <ResizablePanelGroup orientation="horizontal" className="size-full">
      <ResizablePanel minSize="12rem">
        <LogsPanel selected={selected} onSelect={toggle} />
      </ResizablePanel>
      {selected && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize="20rem" minSize="12rem">
            <InspectorPanel selection={selected} />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  )
}
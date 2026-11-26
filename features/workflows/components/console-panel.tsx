"use client"

import { useState } from "react"
import { useStore } from "@xyflow/react"
import { Terminal } from "lucide-react"

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { ExecutionStatusBar } from "@/features/workflows/components/execution-status-bar"
import { InspectorPanel } from "@/features/workflows/components/inspector-panel"
import {
  LogsPanel,
  type ConsoleSelection,
} from "@/features/workflows/components/logs-panel"
import { useWorkflowExecutionState } from "@/features/workflows/components/workflow-runs-provider"

function isSameSelection(a: ConsoleSelection, b: ConsoleSelection) {
  if (a.kind !== b.kind) return false
  if (a.runId !== b.runId) return false
  return a.kind === "step" && b.kind === "step" ? a.nodeId === b.nodeId : true
}

export function ConsolePanel() {
  const [manualSelection, setManualSelection] =
    useState<ConsoleSelection | null>(null)
  const [prevCanvasNodeId, setPrevCanvasNodeId] = useState<string | undefined>(
    undefined
  )

  const selectedCanvasNodeId = useStore(
    (s) => s.nodes.find((n) => n.selected)?.id
  )
  const { latestExecution } = useWorkflowExecutionState()

  // Clear manual override whenever the user selects a different node on canvas
  if (selectedCanvasNodeId !== prevCanvasNodeId) {
    setPrevCanvasNodeId(selectedCanvasNodeId)
    if (selectedCanvasNodeId && latestExecution) {
      const hasStep = latestExecution.steps.some(
        (s) => s.nodeId === selectedCanvasNodeId
      )
      if (hasStep) {
        setManualSelection({
          kind: "step",
          runId: latestExecution.id,
          nodeId: selectedCanvasNodeId,
        })
      }
    }
  }

  const toggle = (selection: ConsoleSelection) => {
    setManualSelection((prev) =>
      prev && isSameSelection(prev, selection) ? null : selection
    )
  }

  return (
    <div className="flex size-full flex-col bg-card/60 backdrop-blur-xs">
      <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-card/90 px-3.5 py-1.5">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide text-foreground">
            Console
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Execution, Logs &amp; Inspector
        </span>
      </div>
      <ExecutionStatusBar />
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup orientation="horizontal" className="size-full">
          <ResizablePanel
            defaultSize={manualSelection ? "55%" : "100%"}
            minSize="200px"
          >
            <LogsPanel selected={manualSelection} onSelect={toggle} />
          </ResizablePanel>
          {manualSelection && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize="45%" minSize="240px">
                <InspectorPanel selection={manualSelection} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  )
}

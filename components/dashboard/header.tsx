"use client"

import * as React from "react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { PanelLeft, MoreHorizontal, Play, Loader2 } from "lucide-react"
import { useWorkflows } from "@/features/workflows/hooks/use-workflows"
import { runWorkflowAction } from "@/features/workflows/actions"
import { toast } from "sonner"

export function DashboardHeader() {
  const { toggleSidebar } = useSidebar()
  const { selectedWorkflow } = useWorkflows()
  const [isRunning, setIsRunning] = React.useState(false)

  const handleRun = async () => {
    if (!selectedWorkflow || isRunning) return
    setIsRunning(true)
    try {
      const result = await runWorkflowAction(selectedWorkflow.id)
      if (result.status === "success") {
        toast.success(`Workflow "${selectedWorkflow.name}" completed`)
      } else {
        toast.error(`Workflow failed: ${result.error || "Unknown error"}`)
      }
    } catch {
      toast.error("Failed to run workflow")
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <>
      {/* Mobile Top Bar (only visible on mobile devices where sidebar is in a sheet) */}
      <div className="flex md:hidden h-11 items-center justify-between px-3 border-b border-neutral-800/80 bg-background shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-7 text-neutral-400 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-4" />
        </Button>
        <span className="text-xs font-medium text-neutral-300 truncate">
          {selectedWorkflow ? selectedWorkflow.name : "Bar Inc."}
        </span>
        <div className="size-7" />
      </div>

      {/* When a workflow is selected: Top-right Canvas Controls (design/canvas.png) */}
      {selectedWorkflow && (
        <div className="hidden md:flex items-center justify-between px-4 py-2 border-b border-neutral-800/50 bg-[#141416] shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-400">Workflow:</span>
            <span className="text-sm font-semibold text-white tracking-tight">
              {selectedWorkflow.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live collaborator badges from canvas.png */}
            <div className="flex items-center -space-x-1.5">
              <span className="size-6 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#141416]">
                M
              </span>
              <span className="size-6 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#141416]">
                L
              </span>
              <span className="size-6 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#141416]">
                S
              </span>
              <span className="size-6 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-[#141416]">
                N
              </span>
            </div>

            {/* More options button */}
            <button
              className="size-7 rounded-md hover:bg-neutral-800/70 text-neutral-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>

            {/* Run Button (design/canvas.png) */}
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700/80 text-white text-xs font-medium border border-neutral-700/60 shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Play className="size-3 fill-current" />
              )}
              <span>{isRunning ? "Running…" : "Run"}</span>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
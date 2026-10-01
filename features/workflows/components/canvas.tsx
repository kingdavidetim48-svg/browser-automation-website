"use client"

import * as React from "react"
import { Plus, Play, ZoomIn, ZoomOut, Maximize2, Lock } from "lucide-react"
import { WorkflowNodeIcon } from "./node-icon"
import { useWorkflows } from "../hooks/use-workflows"
import { WorkflowToolbar } from "./toolbar"

export function WorkflowCanvas() {
  const { selectedWorkflow, createWorkflow } = useWorkflows()

  // Empty state: No workflow selected
  if (!selectedWorkflow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#141416]">
        <div className="size-14 rounded-2xl bg-[#222224] border border-white/5 flex items-center justify-center text-white/90 shadow-md mb-4 transition-transform hover:scale-105 duration-200">
          <WorkflowNodeIcon className="size-7 stroke-[2]" />
        </div>

        <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
          No workflow selected
        </h2>

        <p className="text-sm text-neutral-400 text-center max-w-[280px] leading-relaxed mb-6">
          Select a workflow from the sidebar or create a new one to get started.
        </p>

        <button
          onClick={() => createWorkflow()}
          className="bg-white text-black hover:bg-neutral-200 font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>New workflow</span>
        </button>
      </div>
    )
  }

  // Active Workflow Canvas View
  return (
    <div className="flex-1 flex relative overflow-hidden bg-[#141416] select-none">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Nodes on Canvas */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#222224] border border-neutral-700/60 shadow-lg text-white hover:border-neutral-500 transition-colors">
            <div className="size-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Play className="size-3.5 fill-current" />
            </div>
            <span className="text-sm font-medium">Start</span>
          </div>
        </div>

        {/* Live Collaborators */}
        <div className="absolute top-[28%] left-[25%] pointer-events-none hidden sm:flex items-center gap-1.5 animate-pulse">
          <div className="size-2 rounded-full bg-emerald-400" />
          <div className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-medium shadow-sm">
            Sofia Rossi
          </div>
        </div>

        <div className="absolute top-[34%] right-[42%] pointer-events-none hidden sm:flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-blue-400" />
          <div className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[11px] font-medium shadow-sm">
            Liam Park
          </div>
        </div>

        <div className="absolute top-[40%] right-[32%] pointer-events-none hidden sm:flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-pink-400" />
          <div className="px-2 py-0.5 rounded-full bg-pink-500 text-white text-[11px] font-medium shadow-sm">
            Maya Chen
          </div>
        </div>

        <div className="absolute bottom-[28%] right-[34%] pointer-events-none hidden sm:flex items-center gap-1.5">
          <div className="size-2 rounded-full bg-amber-400" />
          <div className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-medium shadow-sm">
            Noah Kim
          </div>
        </div>

        {/* Canvas Controls */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col bg-[#1e1e21] border border-neutral-800 rounded-lg p-1 shadow-md text-neutral-400">
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer" title="Zoom in">
            <ZoomIn className="size-4" />
          </button>
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer" title="Zoom out">
            <ZoomOut className="size-4" />
          </button>
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer" title="Fit to screen">
            <Maximize2 className="size-4" />
          </button>
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors cursor-pointer" title="Lock canvas">
            <Lock className="size-4" />
          </button>
        </div>

        {/* Logs Banner */}
        <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-neutral-800/80 bg-[#161619] px-4 flex items-center justify-between text-xs text-neutral-400 font-medium tracking-wide">
          <span>LOGS</span>
        </div>
      </div>

      {/* Toolbar / Editor side panel */}
      <WorkflowToolbar />
    </div>
  )
}

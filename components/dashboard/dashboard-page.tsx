"use client"

import * as React from "react"
import { Plus, Play, Globe, Sparkles, Table2, Eye, Bot, Mail, ChevronUp, ZoomIn, ZoomOut, Maximize2, Lock } from "lucide-react"
import { WorkflowNodeIcon } from "./workflow-icon"
import { useWorkflows } from "./workflow-context"
import { cn } from "cn"

export function DashboardPage() {
  const { selectedWorkflow, createWorkflow, selectWorkflow } = useWorkflows()
  const [activeTab, setActiveTab] = React.useState<"toolbar" | "editor">("toolbar")
  const [triggersOpen, setTriggersOpen] = React.useState(true)
  const [actionsOpen, setActionsOpen] = React.useState(true)

  // Empty state: No workflow selected (design/no-workflow-selected.png)
  if (!selectedWorkflow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#141416]">
        {/* Workflow Node Icon Box */}
        <div className="size-14 rounded-2xl bg-[#222224] border border-white/5 flex items-center justify-center text-white/90 shadow-md mb-4 transition-transform hover:scale-105 duration-200">
          <WorkflowNodeIcon className="size-7 stroke-[2]" />
        </div>

        {/* Title */}
        <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
          No workflow selected
        </h2>

        {/* Subtitle */}
        <p className="text-sm text-neutral-400 text-center max-w-[280px] leading-relaxed mb-6">
          Select a workflow from the sidebar or create a new one to get started.
        </p>

        {/* Action Button */}
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

  // Active Workflow Canvas View (design/canvas.png)
  return (
    <div className="flex-1 flex relative overflow-hidden bg-[#141416] select-none">
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Simulated Nodes on Canvas (design/canvas.png) */}
        <div className="relative z-10 flex flex-col items-center">
          {/* Start Node */}
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#222224] border border-neutral-700/60 shadow-lg text-white hover:border-neutral-500 transition-colors">
            <div className="size-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Play className="size-3.5 fill-current" />
            </div>
            <span className="text-sm font-medium">Start</span>
          </div>
        </div>

        {/* Mock Simulated Live Cursors (design/canvas.png) */}
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

        {/* Bottom Left Canvas Controls (design/canvas.png) */}
        <div className="absolute bottom-4 left-4 z-20 flex flex-col bg-[#1e1e21] border border-neutral-800 rounded-lg p-1 shadow-md text-neutral-400">
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors" title="Zoom in">
            <ZoomIn className="size-4" />
          </button>
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors" title="Zoom out">
            <ZoomOut className="size-4" />
          </button>
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors" title="Fit to screen">
            <Maximize2 className="size-4" />
          </button>
          <button className="p-1.5 hover:text-white hover:bg-neutral-800 rounded transition-colors" title="Lock canvas">
            <Lock className="size-4" />
          </button>
        </div>

        {/* Collapsed Logs Banner at Bottom (design/canvas.png) */}
        <div className="absolute bottom-0 left-0 right-0 h-8 border-t border-neutral-800/80 bg-[#161619] px-4 flex items-center justify-between text-xs text-neutral-400 font-medium tracking-wide">
          <span>LOGS</span>
        </div>
      </div>

      {/* Right Sidebar Toolbar / Editor (design/right-sidebar.png) */}
      <div className="w-64 border-l border-neutral-800/80 bg-[#141416] flex flex-col shrink-0 hidden lg:flex">
        {/* Tabs: Toolbar | Editor */}
        <div className="flex items-center gap-1 p-3 border-b border-neutral-800/60">
          <button
            onClick={() => setActiveTab("toolbar")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
              activeTab === "toolbar"
                ? "bg-[#242426] text-white shadow-xs"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Toolbar
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={cn(
              "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
              activeTab === "editor"
                ? "bg-[#242426] text-white shadow-xs"
                : "text-neutral-400 hover:text-white"
            )}
          >
            Editor
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <h3 className="text-sm font-semibold text-white">
            {activeTab === "toolbar" ? "Toolbar" : "Editor"}
          </h3>

          {activeTab === "toolbar" ? (
            <>
              {/* Triggers Section */}
              <div className="space-y-2">
                <button
                  onClick={() => setTriggersOpen(!triggersOpen)}
                  className="w-full flex items-center justify-between text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  <span>Triggers</span>
                  <ChevronUp className={cn("size-3.5 transition-transform", !triggersOpen && "rotate-180")} />
                </button>
                {triggersOpen && (
                  <div className="space-y-1 pl-1">
                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-blue-600 flex items-center justify-center text-white">
                        <Sparkles className="size-3.5" />
                      </div>
                      <span>Start</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Section */}
              <div className="space-y-2">
                <button
                  onClick={() => setActionsOpen(!actionsOpen)}
                  className="w-full flex items-center justify-between text-xs font-medium text-neutral-400 hover:text-white transition-colors"
                >
                  <span>Actions</span>
                  <ChevronUp className={cn("size-3.5 transition-transform", !actionsOpen && "rotate-180")} />
                </button>
                {actionsOpen && (
                  <div className="space-y-1 pl-1">
                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-emerald-600 flex items-center justify-center text-white">
                        <Globe className="size-3.5" />
                      </div>
                      <span>Open URL</span>
                    </div>

                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-purple-600 flex items-center justify-center text-white">
                        <Sparkles className="size-3.5" />
                      </div>
                      <span>Act</span>
                    </div>

                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-amber-600 flex items-center justify-center text-white">
                        <Table2 className="size-3.5" />
                      </div>
                      <span>Extract</span>
                    </div>

                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-cyan-600 flex items-center justify-center text-white">
                        <Eye className="size-3.5" />
                      </div>
                      <span>Observe</span>
                    </div>

                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-rose-600 flex items-center justify-center text-white">
                        <Bot className="size-3.5" />
                      </div>
                      <span>Agent</span>
                    </div>

                    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm">
                      <div className="size-6 rounded-md bg-orange-600 flex items-center justify-center text-white">
                        <Mail className="size-3.5" />
                      </div>
                      <span>Send Email</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-neutral-400 p-2">
              No node selected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#141416] animate-pulse">
      <div className="size-14 rounded-2xl bg-[#222224] mb-4" />
      <div className="h-6 w-48 bg-[#222224] rounded-md mb-2" />
      <div className="h-4 w-64 bg-[#222224] rounded-md mb-6" />
      <div className="h-9 w-32 bg-[#222224] rounded-lg" />
    </div>
  )
}
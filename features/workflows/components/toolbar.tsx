"use client"

import * as React from "react"
import { ChevronUp } from "lucide-react"
import { cn } from "cn"
import { NODE_DEFINITIONS } from "../nodes/definitions"

interface ToolbarProps {
  className?: string
}

export function WorkflowToolbar({ className }: ToolbarProps) {
  const [activeTab, setActiveTab] = React.useState<"toolbar" | "editor">("toolbar")
  const [triggersOpen, setTriggersOpen] = React.useState(true)
  const [actionsOpen, setActionsOpen] = React.useState(true)

  const triggers = Object.values(NODE_DEFINITIONS).filter((n) => n.category === "trigger")
  const actions = Object.values(NODE_DEFINITIONS).filter((n) => n.category === "action")

  return (
    <div className={cn("w-64 border-l border-neutral-800/80 bg-[#141416] flex flex-col shrink-0 hidden lg:flex select-none", className)}>
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
                className="w-full flex items-center justify-between text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <span>Triggers</span>
                <ChevronUp className={cn("size-3.5 transition-transform", !triggersOpen && "rotate-180")} />
              </button>
              {triggersOpen && (
                <div className="space-y-1 pl-1">
                  {triggers.map((trigger) => {
                    const Icon = trigger.icon
                    return (
                      <div
                        key={trigger.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm"
                      >
                        <div className={cn("size-6 rounded-md flex items-center justify-center text-white", trigger.color)}>
                          <Icon className="size-3.5" />
                        </div>
                        <span>{trigger.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Actions Section */}
            <div className="space-y-2">
              <button
                onClick={() => setActionsOpen(!actionsOpen)}
                className="w-full flex items-center justify-between text-xs font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <span>Actions</span>
                <ChevronUp className={cn("size-3.5 transition-transform", !actionsOpen && "rotate-180")} />
              </button>
              {actionsOpen && (
                <div className="space-y-1 pl-1">
                  {actions.map((action) => {
                    const Icon = action.icon
                    return (
                      <div
                        key={action.id}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-neutral-800/50 text-neutral-300 hover:text-white cursor-pointer transition-colors text-sm"
                      >
                        <div className={cn("size-6 rounded-md flex items-center justify-center text-white", action.color)}>
                          <Icon className="size-3.5" />
                        </div>
                        <span>{action.name}</span>
                      </div>
                    )
                  })}
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
  )
}

"use client"

import * as React from "react"
import { cn } from "cn"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  PanelLeft,
  Plus,
} from "lucide-react"
import { WorkflowNodeIcon } from "@/features/workflows/components/node-icon"
import { useWorkflows } from "@/features/workflows/hooks/use-workflows"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const { workflows, selectedWorkflowId, selectWorkflow, createWorkflow } = useWorkflows()
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  // Collapsed Sidebar View (design/collapsed-app-sidebar.png)
  if (isCollapsed) {
    return (
      <aside className="w-12 h-screen flex flex-col items-center py-3 bg-background border-r border-transparent select-none shrink-0 z-30">
        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-8 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-md transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeft className="size-4.5" />
        </Button>

        {/* Workflow Popover (design/collapsed-app-sidebar-workflow-list.png) */}
        <div className="mt-4">
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-8 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/60 transition-colors",
                  popoverOpen && "bg-neutral-800 text-white"
                )}
                title="Workflows"
              >
                <WorkflowNodeIcon className="size-4.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={12}
              className="w-56 p-1.5 bg-[#18181b] border border-neutral-800 rounded-xl shadow-xl text-neutral-200"
            >
              <button
                onClick={() => {
                  createWorkflow()
                  setPopoverOpen(false)
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-800/80 rounded-lg transition-colors cursor-pointer text-left"
              >
                <Plus className="size-4" />
                <span>New workflow</span>
              </button>

              <div className="h-px bg-neutral-800/80 my-1.5" />

              <div className="max-h-[360px] overflow-y-auto space-y-0.5 pr-0.5">
                {workflows.map((workflow) => {
                  const isActive = selectedWorkflowId === workflow.id
                  return (
                    <button
                      key={workflow.id}
                      onClick={() => {
                        selectWorkflow(workflow.id)
                        setPopoverOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 text-sm rounded-lg transition-colors truncate block cursor-pointer",
                        isActive
                          ? "bg-neutral-800 text-white font-medium"
                          : "text-neutral-300 hover:text-white hover:bg-neutral-800/50"
                      )}
                    >
                      {workflow.name}
                    </button>
                  )
                })}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* User Avatar via Clerk UserButton */}
        <div className="mt-auto flex items-center justify-center">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "size-8 rounded-full",
                userButtonPopoverCard: "bg-[#18181b] border border-neutral-800 text-neutral-200 rounded-xl shadow-xl",
                userButtonPopoverActionButton: "text-neutral-300 hover:text-white hover:bg-neutral-800",
                userButtonPopoverFooter: "border-t border-neutral-800",
              },
            }}
          />
        </div>
      </aside>
    )
  }

  // Expanded Sidebar View (design/app-sidebar.png)
  return (
    <aside className="w-60 h-screen flex flex-col py-3 px-2 bg-background border-r border-transparent select-none shrink-0 z-30">
      {/* Top Header: Organization Switcher + Collapse Button */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-2">
        <OrganizationSwitcher
          hidePersonal={false}
          appearance={{
            elements: {
              rootBox: "flex items-center max-w-[170px]",
              organizationSwitcherTrigger: "flex items-center gap-2 p-1.5 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/50 transition-colors max-w-full",
              organizationPreviewTextContainer: "text-left truncate",
              organizationPreviewMainIdentifier: "text-sm font-medium text-neutral-200 truncate",
              organizationPreviewSecondaryIdentifier: "text-xs text-neutral-400 truncate",
              organizationSwitcherPopoverCard: "bg-[#18181b] border border-neutral-800 shadow-xl text-neutral-200 rounded-xl",
              organizationSwitcherPopoverActionButton: "text-neutral-300 hover:text-white hover:bg-neutral-800",
            },
          }}
        />

        {/* Sidebar Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-7 text-neutral-400 hover:text-white hover:bg-neutral-800/60 rounded-md transition-colors"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>

      {/* Workflows Heading Row */}
      <div className="flex items-center justify-between px-2.5 pt-4 pb-2">
        <span className="text-xs font-medium text-neutral-400 tracking-wide">
          Workflows
        </span>
        <button
          onClick={() => createWorkflow()}
          className="text-neutral-400 hover:text-white transition-colors cursor-pointer p-0.5 rounded hover:bg-neutral-800/60"
          title="Create workflow"
          aria-label="Create workflow"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Workflows List */}
      <div className="flex-1 overflow-y-auto px-1 space-y-0.5 scrollbar-thin">
        {workflows.map((workflow) => {
          const isActive = selectedWorkflowId === workflow.id
          return (
            <button
              key={workflow.id}
              onClick={() => selectWorkflow(isActive ? null : workflow.id)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-sm rounded-lg transition-colors truncate block cursor-pointer",
                isActive
                  ? "bg-[#222224] text-white font-medium shadow-xs"
                  : "text-neutral-300 hover:text-white hover:bg-neutral-800/40 font-normal"
              )}
            >
              {workflow.name}
            </button>
          )
        })}
      </div>

      {/* Sidebar Footer with Clerk UserButton */}
      <div className="pt-2 px-2.5 mt-auto flex items-center justify-between border-t border-neutral-800/40">
        <div className="flex items-center gap-2.5 py-1">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonAvatarBox: "size-8 rounded-full",
                userButtonOuterIdentifier: "text-sm text-neutral-300 font-medium truncate max-w-[130px]",
                userButtonPopoverCard: "bg-[#18181b] border border-neutral-800 text-neutral-200 rounded-xl shadow-xl",
                userButtonPopoverActionButton: "text-neutral-300 hover:text-white hover:bg-neutral-800",
                userButtonPopoverFooter: "border-t border-neutral-800",
              },
            }}
          />
        </div>
      </div>
    </aside>
  )
}
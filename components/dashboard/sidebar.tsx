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
import { PanelLeft, Plus, Workflow } from "lucide-react"
import { useWorkflows } from "@/features/workflows/hooks/use-workflows"
import { UserButton, OrganizationSwitcher } from "@clerk/nextjs"
import { NewWorkflowDialog } from "@/components/dashboard/new-workflow-dialog"

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const {
    workflows,
    selectedWorkflowId,
    selectWorkflow,
    isLoading,
  } = useWorkflows()
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const [newWorkflowOpen, setNewWorkflowOpen] = React.useState(false)

  // Collapsed Sidebar View (design/collapsed-app-sidebar.png)
  if (isCollapsed) {
    return (
      <>
      <aside className="z-30 flex h-screen w-12 shrink-0 flex-col items-center border-r border-transparent bg-background py-3 select-none">
        {/* Expand toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-8 rounded-md text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
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
                  "size-8 rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white",
                  popoverOpen && "bg-neutral-800 text-white"
                )}
                title="Workflows"
              >
                <Workflow className="size-4.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="right"
              align="start"
              sideOffset={12}
              className="w-56 rounded-xl border border-neutral-800 bg-[#18181b] p-1.5 text-neutral-200 shadow-xl"
            >
              <button
                disabled={isLoading}
                onClick={() => {
                  setPopoverOpen(false)
                  setNewWorkflowOpen(true)
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-white transition-colors hover:bg-neutral-800/80 disabled:cursor-wait disabled:opacity-50"
              >
                <Plus className="size-4" />
                <span>New workflow</span>
              </button>

              <div className="my-1.5 h-px bg-neutral-800/80" />

              <div className="max-h-[360px] space-y-0.5 overflow-y-auto pr-0.5">
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
                        "block w-full cursor-pointer truncate rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-neutral-800 font-medium text-white"
                          : "text-neutral-300 hover:bg-neutral-800/50 hover:text-white"
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
                userButtonPopoverCard:
                  "bg-[#18181b] border border-neutral-800 text-neutral-200 rounded-xl shadow-xl",
                userButtonPopoverActionButton:
                  "text-neutral-300 hover:text-white hover:bg-neutral-800",
                userButtonPopoverFooter: "border-t border-neutral-800",
              },
            }}
          />
        </div>
      </aside>
      <NewWorkflowDialog
        open={newWorkflowOpen}
        onOpenChange={setNewWorkflowOpen}
      />
      </>
    )
  }

  // Expanded Sidebar View (design/app-sidebar.png)
  return (
    <>
    <aside className="z-30 flex h-screen w-60 shrink-0 flex-col border-r border-transparent bg-background px-2 py-3 select-none">
      {/* Top Header: Organization Switcher + Collapse Button */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-2">
        <OrganizationSwitcher
          hidePersonal={false}
          appearance={{
            elements: {
              rootBox: "flex items-center max-w-[170px]",
              organizationSwitcherTrigger:
                "flex items-center gap-2 p-1.5 rounded-lg text-sm text-neutral-200 hover:text-white hover:bg-neutral-800/50 transition-colors max-w-full",
              organizationPreviewTextContainer: "text-left truncate",
              organizationPreviewMainIdentifier:
                "text-sm font-medium text-neutral-200 truncate",
              organizationPreviewSecondaryIdentifier:
                "text-xs text-neutral-400 truncate",
              organizationSwitcherPopoverCard:
                "bg-[#18181b] border border-neutral-800 shadow-xl text-neutral-200 rounded-xl",
              organizationSwitcherPopoverActionButton:
                "text-neutral-300 hover:text-white hover:bg-neutral-800",
            },
          }}
        />

        {/* Sidebar Collapse Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-7 rounded-md text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeft className="size-4" />
        </Button>
      </div>

      {/* Workflows Heading Row */}
      <div className="flex items-center justify-between px-2.5 pt-4 pb-2">
        <span className="text-xs font-medium tracking-wide text-neutral-400">
          Workflows
        </span>
        <button
          disabled={isLoading}
          onClick={() => setNewWorkflowOpen(true)}
          className="cursor-pointer rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-800/60 hover:text-white disabled:cursor-wait disabled:opacity-50"
          title="Create workflow"
          aria-label="Create workflow"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {/* Workflows List */}
      <div className="flex-1 scrollbar-thin space-y-0.5 overflow-y-auto px-1">
        {workflows.map((workflow) => {
          const isActive = selectedWorkflowId === workflow.id
          return (
            <button
              key={workflow.id}
              onClick={() => selectWorkflow(workflow.id)}
              className={cn(
                "block w-full cursor-pointer truncate rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-[#222224] font-medium text-white shadow-xs"
                  : "font-normal text-neutral-300 hover:bg-neutral-800/40 hover:text-white"
              )}
            >
              {workflow.name}
            </button>
          )
        })}
      </div>

      {/* Sidebar Footer with Clerk UserButton */}
      <div className="mt-auto flex items-center justify-between border-t border-neutral-800/40 px-2.5 pt-2">
        <div className="flex items-center gap-2.5 py-1">
          <UserButton
            showName
            appearance={{
              elements: {
                userButtonAvatarBox: "size-8 rounded-full",
                userButtonOuterIdentifier:
                  "text-sm text-neutral-300 font-medium truncate max-w-[130px]",
                userButtonPopoverCard:
                  "bg-[#18181b] border border-neutral-800 text-neutral-200 rounded-xl shadow-xl",
                userButtonPopoverActionButton:
                  "text-neutral-300 hover:text-white hover:bg-neutral-800",
                userButtonPopoverFooter: "border-t border-neutral-800",
              },
            }}
          />
        </div>
      </div>
    </aside>
    <NewWorkflowDialog
      open={newWorkflowOpen}
      onOpenChange={setNewWorkflowOpen}
    />
    </>
  )
}

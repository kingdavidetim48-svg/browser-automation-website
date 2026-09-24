"use client"

import * as React from "react"
import { cn } from "cn"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Building2,
  ChevronDown,
  PanelLeft,
  Plus,
  LogOut,
  Sun,
  Moon,
  User,
  Check,
} from "lucide-react"
import { WorkflowNodeIcon } from "./workflow-icon"
import { useWorkflows } from "./workflow-context"
import { useSession, signOut } from "@/lib/auth-client"
import { useTheme } from "next-themes"

export function DashboardSidebar() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const { workflows, selectedWorkflowId, selectWorkflow, createWorkflow } = useWorkflows()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [popoverOpen, setPopoverOpen] = React.useState(false)

  const userName = session?.user?.name || "User"
  const userEmail = session?.user?.email || "user@company.com"
  const userInitial = userName.charAt(0).toUpperCase() || "A"

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

        {/* User Avatar Menu at Bottom */}
        <div className="mt-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="size-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                aria-label="User profile"
              >
                {userInitial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="end"
              sideOffset={12}
              className="w-52 p-1.5 bg-[#18181b] border border-neutral-800 rounded-xl shadow-xl text-neutral-200 text-sm"
            >
              <div className="px-2.5 py-2">
                <p className="font-medium text-white text-sm truncate">{userName}</p>
                <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
              </div>
              <DropdownMenuSeparator className="bg-neutral-800 my-1" />
              <DropdownMenuItem
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
                <span>Toggle theme</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-neutral-800 my-1" />
              <DropdownMenuItem
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
                onClick={() => signOut()}
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    )
  }

  // Expanded Sidebar View (design/app-sidebar.png)
  return (
    <aside className="w-60 h-screen flex flex-col py-3 px-2 bg-background border-r border-transparent select-none shrink-0 z-30">
      {/* Top Header: Organization Switcher + Collapse Button */}
      <div className="flex items-center justify-between px-2 pt-0.5 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 hover:bg-neutral-800/50 p-1.5 rounded-lg transition-colors cursor-pointer group outline-none"
              aria-label="Switch organization"
            >
              <div className="size-7 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm shrink-0">
                <Building2 className="size-4" />
              </div>
              <span className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors truncate max-w-[115px]">
                Bar Inc.
              </span>
              <ChevronDown className="size-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="w-48 p-1.5 bg-[#18181b] border border-neutral-800 rounded-xl shadow-xl text-neutral-200 text-sm"
          >
            <div className="px-2 py-1 text-xs text-neutral-400 font-medium">Organizations</div>
            <DropdownMenuItem className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-neutral-800/70 text-white font-medium cursor-pointer">
              <span className="flex items-center gap-2">
                <div className="size-4.5 rounded bg-purple-600 flex items-center justify-center text-[10px] text-white">B</div>
                Bar Inc.
              </span>
              <Check className="size-3.5 text-purple-400" />
            </DropdownMenuItem>
            <DropdownMenuItem className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer">
              <div className="size-4.5 rounded bg-neutral-700 flex items-center justify-center text-[10px] text-white">P</div>
              Personal
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

      {/* Sidebar Footer with User Avatar */}
      <div className="pt-2 px-1 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="size-8 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
              aria-label="User profile"
            >
              {userInitial}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={10}
            className="w-52 p-1.5 bg-[#18181b] border border-neutral-800 rounded-xl shadow-xl text-neutral-200 text-sm"
          >
            <div className="px-2.5 py-2">
              <p className="font-medium text-white text-sm truncate">{userName}</p>
              <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator className="bg-neutral-800 my-1" />
            <DropdownMenuItem
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 cursor-pointer"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              <span>Toggle theme</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-neutral-800 my-1" />
            <DropdownMenuItem
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer"
              onClick={() => signOut()}
            >
              <LogOut className="size-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
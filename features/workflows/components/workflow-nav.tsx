"use client"

import { useTransition } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { PlusIcon, WorkflowIcon } from "lucide-react"
import { toast } from "sonner"

import { generateSlug } from "@/features/workflows/lib/generate-slug"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import type { Workflow } from "@/lib/db/schema"

interface WorkflowNavProps {
  workflows: Workflow[]
  onCreateWorkflow: (name: string) => Promise<void>
  disabled?: boolean
}

export function WorkflowNav({
  workflows,
  onCreateWorkflow,
  disabled = false,
}: WorkflowNavProps) {
  const { state } = useSidebar()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const handleCreateWorkflow = () => {
    if (disabled) return
    startTransition(async () => {
      try {
        await onCreateWorkflow(generateSlug())
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create workflow"
        )
      }
    })
  }

  const workflowItems = workflows.map((workflow) => {
    const isActive = pathname === `/workflows/${workflow.id}`
    return (
      <SidebarMenuItem key={workflow.id}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          className="group/wf font-medium transition-all"
        >
          <Link href={`/workflows/${workflow.id}`} className="flex items-center gap-2">
            <WorkflowIcon className={cn("size-3.5 shrink-0 text-muted-foreground group-hover/wf:text-foreground transition-colors", isActive && "text-primary")} />
            <span className="truncate text-xs">{workflow.name}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  })

  if (state === "collapsed") {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton tooltip="Workflows">
                    <WorkflowIcon />
                    <span>Workflows</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="p-1">
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={handleCreateWorkflow}
                        disabled={isPending || disabled}
                        title={disabled ? "Select an organization first" : "New workflow"}
                      >
                        <PlusIcon />
                        <span>New workflow</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                  <SidebarSeparator className="mx-0" />
                  <SidebarMenu className="gap-y-0.5">{workflowItems}</SidebarMenu>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Workflows</SidebarGroupLabel>
      <SidebarGroupAction
        title={disabled ? "Select an organization first" : "New workflow"}
        onClick={handleCreateWorkflow}
        disabled={isPending || disabled}
      >
        <PlusIcon />
        <span className="sr-only">New workflow</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        {workflows.length === 0 ? (
          <div className="px-2 py-3 text-center">
            <p className="text-xs text-muted-foreground/80">No workflows yet</p>
          </div>
        ) : (
          <SidebarMenu className="gap-y-0.5">{workflowItems}</SidebarMenu>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
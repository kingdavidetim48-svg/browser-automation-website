"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"
import { useWorkflows } from "@/features/workflows/hooks/use-workflows"

export function DashboardHeader() {
  const { toggleSidebar } = useSidebar()
  const { selectedWorkflow } = useWorkflows()

  return (
    <>
      {/* Mobile Top Bar (only visible on mobile devices where sidebar is in a sheet) */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-800/80 bg-background px-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="size-7 text-neutral-400 hover:text-white"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="size-4" />
        </Button>
        <span className="truncate text-xs font-medium text-neutral-300">
          {selectedWorkflow ? selectedWorkflow.name : "KingsFlow"}
        </span>
        <div className="size-7" />
      </div>

      {/* Workflow selection is shown here; canvas actions live with the editor. */}
      {selectedWorkflow && (
        <div className="hidden shrink-0 border-b border-neutral-800/50 bg-[#141416] px-4 py-2 md:flex">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-400">
              Workflow:
            </span>
            <span className="text-sm font-semibold tracking-tight text-white">
              {selectedWorkflow.name}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

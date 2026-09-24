"use client"

import * as React from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { WorkflowProvider } from "@/components/dashboard/workflow-context"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen>
      <WorkflowProvider>
        <TooltipProvider>
          <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
            {/* Left App Sidebar */}
            <DashboardSidebar />

            {/* Main Rounded Inset Canvas Container (Chapter 6 Dashboard Layout) */}
            <div className="relative flex-1 m-0 md:my-2 md:mr-2 md:ml-0 rounded-none md:rounded-xl border-0 md:border border-neutral-800/80 bg-[#141416] overflow-hidden flex flex-col shadow-xs">
              <DashboardHeader />
              <div className="flex-1 flex flex-col overflow-auto">
                {children}
              </div>
            </div>
          </div>
        </TooltipProvider>
      </WorkflowProvider>
    </SidebarProvider>
  )
}
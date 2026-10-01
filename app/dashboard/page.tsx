"use client"
import * as React from "react"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { WorkflowCanvas } from "@/features/workflows/components/canvas"

export default function Dashboard() {
  return (
    <DashboardLayout>
      <WorkflowCanvas />
    </DashboardLayout>
  )
}
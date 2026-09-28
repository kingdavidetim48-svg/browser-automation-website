"use client"
import * as React from "react"
import { useSession } from "@/lib/auth-client"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { DashboardPage as DashboardContent, DashboardPageSkeleton } from "@/components/dashboard/dashboard-page"
import { Loader2 } from "lucide-react"

export default function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  )
}
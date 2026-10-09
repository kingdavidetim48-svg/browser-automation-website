"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { usePathname, useRouter } from "next/navigation"
import {
  createWorkflowAction,
  listWorkflowsAction,
  renameWorkflowAction,
} from "../actions"

export interface WorkflowItem {
  id: string
  name: string
  createdAt: string
}

interface WorkflowContextType {
  workflows: WorkflowItem[]
  selectedWorkflowId: string | null
  selectedWorkflow: WorkflowItem | null
  selectWorkflow: (id: string | null) => void
  createWorkflow: (name?: string) => Promise<string>
  renameWorkflow: (id: string, name: string) => Promise<string>
  refreshWorkflows: () => Promise<void>
  isLoading: boolean
  error: string | null
}

const WorkflowContext = React.createContext<WorkflowContextType | null>(null)

function workflowIdFromPathname(pathname: string) {
  const [section, id] = pathname.split("/").slice(1)
  if (section !== "workflows" || !id) return null

  try {
    return decodeURIComponent(id)
  } catch {
    return id
  }
}

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const { orgId, isLoaded } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [workflows, setWorkflows] = React.useState<WorkflowItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // The route is the sole source of the open workflow. This context only keeps
  // the sidebar list and navigation helpers; graph state belongs to its editor.
  const selectedWorkflowId = React.useMemo(
    () => workflowIdFromPathname(pathname),
    [pathname]
  )
  const selectedWorkflow = React.useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [workflows, selectedWorkflowId]
  )

  const refreshWorkflows = React.useCallback(async () => {
    if (!isLoaded) return
    if (!orgId) {
      setWorkflows([])
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const records = await listWorkflowsAction()
      setWorkflows(
        records.map((record) => ({
          id: record.id,
          name: record.name,
          createdAt: record.createdAt.toISOString(),
        }))
      )
      setError(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load workflows."
      )
    } finally {
      setIsLoading(false)
    }
  }, [isLoaded, orgId])

  React.useEffect(() => {
    if (!isLoaded) return
    const timer = window.setTimeout(() => void refreshWorkflows(), 0)
    return () => window.clearTimeout(timer)
  }, [isLoaded, refreshWorkflows])

  const selectWorkflow = React.useCallback(
    (id: string | null) => {
      router.push(id ? `/workflows/${encodeURIComponent(id)}` : "/dashboard")
    },
    [router]
  )

  const createWorkflow = React.useCallback(
    async (name = "Untitled Workflow") => {
      const created = await createWorkflowAction(name)
      setWorkflows((current) => [
        {
          id: created.id,
          name: created.name,
          createdAt: created.createdAt.toISOString(),
        },
        ...current.filter((workflow) => workflow.id !== created.id),
      ])
      setError(null)
      router.push(`/workflows/${encodeURIComponent(created.id)}`)
      return created.id
    },
    [router]
  )

  const renameWorkflow = React.useCallback(
    async (id: string, name: string) => {
      const updated = await renameWorkflowAction({ id, name })
      setWorkflows((current) =>
        current.map((workflow) =>
          workflow.id === updated.id
            ? { ...workflow, name: updated.name }
            : workflow
        )
      )
      return updated.name
    },
    []
  )

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        selectedWorkflowId,
        selectedWorkflow,
        selectWorkflow,
        createWorkflow,
        renameWorkflow,
        refreshWorkflows,
        isLoading,
        error,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflows() {
  const context = React.useContext(WorkflowContext)
  if (!context)
    throw new Error("useWorkflows must be used within a WorkflowProvider")
  return context
}

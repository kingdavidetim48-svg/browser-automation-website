"use client"

import * as React from "react"
import { useAuth } from "@clerk/nextjs"
import { createWorkflowAction, getWorkflowsAction } from "../actions"

export interface WorkflowItem {
  id: string
  name: string
  createdAt?: string
  organizationId?: string | null
}

interface WorkflowContextType {
  workflows: WorkflowItem[]
  selectedWorkflowId: string | null
  selectedWorkflow: WorkflowItem | null
  selectWorkflow: (id: string | null) => void
  createWorkflow: (name?: string) => Promise<string>
  refreshWorkflows: () => Promise<void>
  isLoading: boolean
}

const WorkflowContext = React.createContext<WorkflowContextType | null>(null)

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const { orgId, userId, isLoaded: isAuthLoaded } = useAuth()
  const [workflows, setWorkflows] = React.useState<WorkflowItem[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  const fetchWorkflows = React.useCallback(async () => {
    if (!userId) {
      setWorkflows([])
      setSelectedWorkflowId(null)
      setIsLoading(false)
      return
    }

    try {
      const serverWorkflows = await getWorkflowsAction()
      setWorkflows(serverWorkflows)
      setSelectedWorkflowId((prev) => {
        if (prev && serverWorkflows.some((w) => w.id === prev)) {
          return prev
        }
        return serverWorkflows.length > 0 ? serverWorkflows[0].id : null
      })
    } catch (err) {
      console.error("Failed to load workflows:", err)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Reload workflows whenever auth loads or user switches organization
  React.useEffect(() => {
    let isCancelled = false

    if (isAuthLoaded) {
      void (async () => {
        if (!userId) {
          if (!isCancelled) {
            setWorkflows([])
            setSelectedWorkflowId(null)
            setIsLoading(false)
          }
          return
        }

        try {
          const serverWorkflows = await getWorkflowsAction()
          if (!isCancelled) {
            setWorkflows(serverWorkflows)
            setSelectedWorkflowId((prev) => {
              if (prev && serverWorkflows.some((w) => w.id === prev)) {
                return prev
              }
              return serverWorkflows.length > 0 ? serverWorkflows[0].id : null
            })
          }
        } catch (err) {
          console.error("Failed to load workflows:", err)
        } finally {
          if (!isCancelled) {
            setIsLoading(false)
          }
        }
      })()
    }

    return () => {
      isCancelled = true
    }
  }, [isAuthLoaded, orgId, userId])

  const selectedWorkflow = React.useMemo(() => {
    return workflows.find((w) => w.id === selectedWorkflowId) || null
  }, [workflows, selectedWorkflowId])

  const selectWorkflow = React.useCallback((id: string | null) => {
    setSelectedWorkflowId(id)
  }, [])

  const createWorkflow = React.useCallback(
    async (customName?: string) => {
      const newWorkflow = await createWorkflowAction(customName)
      const newItem: WorkflowItem = {
        id: newWorkflow.id,
        name: newWorkflow.name,
        createdAt:
          newWorkflow.createdAt instanceof Date
            ? newWorkflow.createdAt.toISOString()
            : String(newWorkflow.createdAt),
        organizationId: newWorkflow.organizationId,
      }
      setWorkflows((prev) => [newItem, ...prev])
      setSelectedWorkflowId(newItem.id)
      return newItem.id
    },
    [],
  )

  const refreshWorkflows = React.useCallback(async () => {
    await fetchWorkflows()
  }, [fetchWorkflows])

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        selectedWorkflowId,
        selectedWorkflow,
        selectWorkflow,
        createWorkflow,
        refreshWorkflows,
        isLoading,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  )
}

export function useWorkflows() {
  const context = React.useContext(WorkflowContext)
  if (!context) {
    throw new Error("useWorkflows must be used within a WorkflowProvider")
  }
  return context
}
"use client"

import * as React from "react"

export interface WorkflowItem {
  id: string
  name: string
  createdAt?: string
}

const DEFAULT_WORKFLOWS: WorkflowItem[] = [
  { id: "dominant-wasp", name: "dominant-wasp" },
  { id: "honest-reindeer", name: "honest-reindeer" },
  { id: "expected-llama", name: "expected-llama" },
  { id: "essential-ocelot", name: "essential-ocelot" },
  { id: "creepy-echidna", name: "creepy-echidna" },
  { id: "eastern-silkworm", name: "eastern-silkworm" },
  { id: "cultural-lion", name: "cultural-lion" },
  { id: "proud-weasel", name: "proud-weasel" },
  { id: "regional-bonobo", name: "regional-bonobo" },
]

interface WorkflowContextType {
  workflows: WorkflowItem[]
  selectedWorkflowId: string | null
  selectedWorkflow: WorkflowItem | null
  selectWorkflow: (id: string | null) => void
  createWorkflow: (name?: string) => string
}

const WorkflowContext = React.createContext<WorkflowContextType | null>(null)

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflows, setWorkflows] = React.useState<WorkflowItem[]>(DEFAULT_WORKFLOWS)
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<string | null>(null)

  const selectedWorkflow = React.useMemo(() => {
    return workflows.find((w) => w.id === selectedWorkflowId) || null
  }, [workflows, selectedWorkflowId])

  const selectWorkflow = React.useCallback((id: string | null) => {
    setSelectedWorkflowId(id)
  }, [])

  const createWorkflow = React.useCallback((customName?: string) => {
    const adjectives = ["swift", "silent", "gentle", "radiant", "clever", "curious", "stellar"]
    const animals = ["falcon", "otter", "badger", "lynx", "orca", "sparrow", "fox"]
    const randomName =
      customName ||
      `${adjectives[Math.floor(Math.random() * adjectives.length)]}-${animals[Math.floor(Math.random() * animals.length)]}`

    const newWorkflow: WorkflowItem = {
      id: randomName,
      name: randomName,
      createdAt: new Date().toISOString(),
    }

    setWorkflows((prev) => [newWorkflow, ...prev])
    setSelectedWorkflowId(newWorkflow.id)
    return newWorkflow.id
  }, [])

  return (
    <WorkflowContext.Provider
      value={{
        workflows,
        selectedWorkflowId,
        selectedWorkflow,
        selectWorkflow,
        createWorkflow,
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

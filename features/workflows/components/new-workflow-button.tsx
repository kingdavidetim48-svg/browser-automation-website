"use client"

import { useTransition } from "react"
import { PlusIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createWorkflowAction } from "@/features/workflows/actions"

export function NewWorkflowButton() {
  const [isPending, startTransition] = useTransition()

  const handleCreateWorkflow = () => {
    startTransition(async () => {
      await createWorkflowAction(crypto.randomUUID())
    })
  }

  return (
    <Button onClick={handleCreateWorkflow} disabled={isPending}>
      <PlusIcon />
      New workflow
    </Button>
  )
}
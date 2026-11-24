"use client"

import { useTransition } from "react"
import { PlusIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createWorkflowAction } from "@/features/workflows/actions"
import { generateSlug } from "@/features/workflows/lib/generate-slug"

export function NewWorkflowButton({ disabled }: { disabled?: boolean }) {
  const [isPending, startTransition] = useTransition()

  const handleCreateWorkflow = () => {
    startTransition(async () => {
      try {
        await createWorkflowAction(generateSlug())
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create workflow"
        )
      }
    })
  }

  return (
    <Button onClick={handleCreateWorkflow} disabled={isPending || disabled}>
      <PlusIcon />
      New workflow
    </Button>
  )
}
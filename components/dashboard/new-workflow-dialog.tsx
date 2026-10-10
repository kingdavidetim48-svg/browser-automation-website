"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { useWorkflows } from "@/features/workflows/hooks/use-workflows"

export function NewWorkflowDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { createWorkflow } = useWorkflows()
  const [name, setName] = React.useState("Untitled Workflow")
  const [creating, setCreating] = React.useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreating(true)
    try {
      await createWorkflow(name)
      onOpenChange(false)
      setName("Untitled Workflow")
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not create workflow."
      )
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="space-y-1.5">
            <DialogTitle>New workflow</DialogTitle>
            <DialogDescription>Choose a name for your workflow.</DialogDescription>
          </div>
          <input
            autoFocus
            required
            maxLength={256}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-label="Workflow name"
            className="h-9 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 text-sm text-white outline-none focus:border-blue-400"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create workflow"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

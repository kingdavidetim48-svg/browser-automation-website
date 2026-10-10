"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { TriangleAlertIcon, WorkflowIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Spinner } from "@/components/ui/spinner"
import { useWorkflows } from "@/features/workflows/hooks/use-workflows"

export default function Dashboard() {
  const router = useRouter()
  const { workflows, isLoading, error, refreshWorkflows, createWorkflow } =
    useWorkflows()

  React.useEffect(() => {
    const firstWorkflow = workflows[0]
    if (!isLoading && firstWorkflow) {
      router.replace(`/workflows/${encodeURIComponent(firstWorkflow.id)}`)
    }
  }, [isLoading, router, workflows])

  if (isLoading || workflows.length > 0) {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center">
        <Spinner className="size-5" />
        <span className="sr-only">Opening workflow</span>
      </div>
    )
  }

  return (
    <Empty className="min-h-full border-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          {error ? <TriangleAlertIcon /> : <WorkflowIcon />}
        </EmptyMedia>
        <EmptyTitle>
          {error ? "Workflows could not be loaded" : "Build your first workflow"}
        </EmptyTitle>
        <EmptyDescription>
          {error ?? "Add browser actions to a canvas, connect them, and run your workflow."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {error ? (
          <Button variant="outline" onClick={() => void refreshWorkflows()}>
            Try again
          </Button>
        ) : (
          <Button
            onClick={() =>
              void createWorkflow().catch((cause: unknown) =>
                toast.error(
                  cause instanceof Error
                    ? cause.message
                    : "Could not create workflow."
                )
              )
            }
          >
            Create workflow
          </Button>
        )}
      </EmptyContent>
    </Empty>
  )
}

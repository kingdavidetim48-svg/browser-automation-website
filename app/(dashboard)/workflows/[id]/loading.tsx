import { Spinner } from "@/components/ui/spinner"

export default function WorkflowLoading() {
  return (
    <div className="flex min-h-full items-center justify-center" aria-label="Loading workflow">
      <Spinner className="size-6" />
    </div>
  )
}

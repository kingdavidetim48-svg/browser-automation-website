  import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { WorkflowCanvas } from "@/features/workflows/components/canvas"
import { getWorkflow } from "@/features/workflows/data"

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const [{ id }, { orgId }] = await Promise.all([params, auth()])

  // Treat missing and cross-organization IDs identically so a URL cannot reveal
  // whether a workflow exists outside the current Clerk organization.
  if (!orgId) notFound()
  const workflow = await getWorkflow(orgId, id)
  if (!workflow) notFound()

  return (
    <WorkflowCanvas
      key={workflow.id}
      workflow={{
        id: workflow.id,
        name: workflow.name,
        graph: workflow.graph,
      }}
    />
  )
}

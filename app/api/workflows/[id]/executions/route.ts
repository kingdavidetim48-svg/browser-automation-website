import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"

import { getWorkflow } from "@/features/workflows/data"
import { listWorkflowExecutionsWithDetails } from "@/features/workflows/execution-data"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { orgId } = await auth()
  if (!orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const workflow = await getWorkflow(orgId, id)
  if (!workflow) {
    return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
  }

  const executions = await listWorkflowExecutionsWithDetails(orgId, id, 15)
  return NextResponse.json({ executions })
}

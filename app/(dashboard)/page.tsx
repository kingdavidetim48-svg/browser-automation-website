import { auth } from "@clerk/nextjs/server"
import { Building2, WorkflowIcon } from "lucide-react"
import { OrganizationList } from "@clerk/nextjs"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { NewWorkflowButton } from "@/features/workflows/components/new-workflow-button"

export default async function Page() {
  const { orgId } = await auth()

  if (!orgId) {
    return (
      <Empty className="min-h-svh border-none">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 />
          </EmptyMedia>
          <EmptyTitle>Select an organization</EmptyTitle>
          <EmptyDescription>
            Workflows belong to an organization. Choose an existing organization or create a new one to get started.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex justify-center pt-2">
          <OrganizationList
            hidePersonal
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
          />
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <Empty className="min-h-svh border-none">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <WorkflowIcon />
        </EmptyMedia>
        <EmptyTitle>No workflow selected</EmptyTitle>
        <EmptyDescription>
          Select a workflow from the sidebar or create a new one to get started.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <NewWorkflowButton />
      </EmptyContent>
    </Empty>
  )
}

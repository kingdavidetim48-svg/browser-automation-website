import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { WorkflowCanvas } from "./canvas"

import { ConsolePanel } from "./console-panel"
import { RightSidebar } from "./right-sidebar"

interface WorkflowShellProps {
  workflow: { id: string; name: string; graph: { nodes: any[]; edges: any[] } }
}

export function WorkflowShell({ workflow }: WorkflowShellProps) {
  return (
    <ResizablePanelGroup orientation="horizontal" className="size-full">
      <ResizablePanel minSize="30rem">
        <ResizablePanelGroup orientation="vertical">
          <ResizablePanel minSize="18rem">
            <WorkflowCanvas workflow={workflow} />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize="8rem" minSize="6rem">
            <ConsolePanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize="16rem" minSize="14rem" maxSize="36rem">
        <RightSidebar workflowId={workflow.id} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}
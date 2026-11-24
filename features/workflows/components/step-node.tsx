import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"

import {
  nodeRegistry,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"
import { useLatestRunSteps } from "@/features/workflows/components/workflow-runs-provider"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

function StepNodeComponent({ id, data, selected }: NodeProps<StepNodeType>) {
  const { type, kind, title, values } = data
  const def = nodeRegistry[type]
  const Icon = def.icon
  const fields = def.fields.filter((field) => values[field.key])

  // Reflect this node's state in the latest run. A node is only "running" while
  // the run is actually live — once it ends, a node left marked running stops
  // spinning rather than hanging forever.
  const { steps, isLive } = useLatestRunSteps()
  const status = steps.find((step) => step.nodeId === id)?.status
  const isRunning = status === "running" && isLive
  const isFailed = status === "failed"

  // A trigger starts the flow and takes no input, so it has no target handle.
  const hasTarget = kind !== "trigger"

  return (
    <div
      className={cn(
        "min-w-56 max-w-80 rounded-xl border border-border bg-card/95 text-card-foreground shadow-md backdrop-blur-xs transition-shadow duration-150",
        isRunning && "border-blue-500 shadow-blue-500/10 shadow-lg",
        isFailed && "border-destructive shadow-destructive/10 shadow-lg",
        selected && "ring-2 ring-ring ring-offset-2 ring-offset-background border-primary"
      )}
    >
      {hasTarget && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ left: -6, top: "50%", transform: "translateY(-50%)" }}
          className="!size-3 !rounded-full !border-2 !border-background !bg-muted-foreground/60 hover:!bg-primary transition-colors"
        />
      )}

      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-xs",
            def.accent
          )}
        >
          {isRunning ? <Spinner className="size-4" /> : <Icon className="size-4" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold leading-tight">{title}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {kind}
          </span>
        </div>
      </div>

      {fields.length > 0 ? (
        <>
          <div className="border-t border-border/80" />
          <div className="flex flex-col gap-1.5 px-3.5 py-2.5 bg-muted/15">
            {fields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="shrink-0 text-muted-foreground">{field.label}</span>
                <span className="truncate font-mono text-[11px] font-medium bg-background/80 px-1.5 py-0.5 rounded border border-border/60 max-w-[140px]">
                  {values[field.key]}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : def.description ? (
        <div className="border-t border-border/60 bg-muted/15 px-3.5 py-2">
          <p className="text-xs text-muted-foreground leading-normal">
            {def.description}
          </p>
        </div>
      ) : null}

      <Handle
        type="source"
        position={Position.Right}
        style={{ right: -6, top: "50%", transform: "translateY(-50%)" }}
        className="!size-3 !rounded-full !border-2 !border-background !bg-muted-foreground/60 hover:!bg-primary transition-colors"
      />
    </div>
  )
}

export const StepNode = memo(StepNodeComponent)
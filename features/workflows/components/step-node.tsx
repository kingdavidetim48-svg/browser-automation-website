import { memo } from "react"
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  SkipForward,
  Trash2,
} from "lucide-react"
import prettyMilliseconds from "pretty-ms"

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

  // Reflect this node's state in the latest execution. A node is only "running"
  // or "queued" while the execution is actually live.
  const { steps, isLive } = useLatestRunSteps()
  const step = steps.find((s) => s.nodeId === id)
  const rawStatus = step?.status ?? "idle"
  const effectiveStatus =
    !isLive && (rawStatus === "running" || rawStatus === "queued")
      ? "idle"
      : rawStatus

  const isQueued = effectiveStatus === "queued"
  const isRunning = effectiveStatus === "running"
  const isCompleted = effectiveStatus === "completed"
  const isFailed = effectiveStatus === "failed"
  const isSkipped = effectiveStatus === "skipped"

  const { getNode, addNodes, deleteElements } = useReactFlow<StepNodeType>()

  // A trigger starts the flow and takes no input, so it has no target handle.
  const hasTarget = kind !== "trigger"

  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation()
    const node = getNode(id)
    if (!node || node.data.type === "start" || node.data.kind === "trigger") return
    addNodes({
      id: crypto.randomUUID(),
      type: "step",
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      data: {
        ...node.data,
        title: `${node.data.title} (Copy)`,
        values: { ...node.data.values },
      },
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (data.type === "start" || kind === "trigger") return
    deleteElements({ nodes: [{ id }] })
  }

  return (
    <div
      data-execution-status={effectiveStatus}
      className={cn(
        "group/node min-w-56 max-w-80 rounded-xl border border-border bg-card/95 text-card-foreground shadow-md backdrop-blur-xs transition-all duration-200",
        isQueued && "border-amber-500/60 shadow-amber-500/5",
        isRunning &&
          "border-blue-500 ring-2 ring-blue-500/35 shadow-lg shadow-blue-500/20",
        isCompleted && "border-emerald-500/75 shadow-emerald-500/10",
        isFailed &&
          "border-destructive ring-2 ring-destructive/25 shadow-lg shadow-destructive/15",
        isSkipped && "border-dashed border-muted-foreground/40 opacity-65",
        selected &&
          "ring-2 ring-ring ring-offset-2 ring-offset-background border-primary"
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
            def.accent,
            isRunning && "animate-pulse"
          )}
        >
          {isRunning ? <Spinner className="size-4" /> : <Icon className="size-4" />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold leading-tight">{title}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {kind}
            </span>
            {isQueued && (
              <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                <Clock className="size-2.5" />
                Queued
              </span>
            )}
            {isRunning && (
              <span className="inline-flex items-center gap-1 rounded bg-blue-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                <span className="size-1.5 rounded-full bg-blue-500 animate-ping" />
                Running
              </span>
            )}
            {isCompleted && (
              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-2.5" />
                {step?.durationMs != null
                  ? prettyMilliseconds(step.durationMs)
                  : "Done"}
              </span>
            )}
            {isFailed && (
              <span className="inline-flex items-center gap-0.5 rounded bg-destructive/15 px-1.5 py-0.2 text-[10px] font-semibold text-destructive">
                <AlertCircle className="size-2.5" />
                Failed
              </span>
            )}
            {isSkipped && (
              <span className="inline-flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                <SkipForward className="size-2.5" />
                Skipped
              </span>
            )}
          </div>
        </div>
        {kind !== "trigger" && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/node:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={handleDuplicate}
              title="Duplicate step (Ctrl+D)"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Copy className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              title="Delete step (Delete)"
              className="rounded p-1 text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        )}
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

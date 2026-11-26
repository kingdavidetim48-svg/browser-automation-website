"use client"

import { useState, useTransition } from "react"
import { useReactFlow, useStore } from "@xyflow/react"
import { Lock, MoreHorizontal, Play, Sliders, Square, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

import {
  cancelWorkflowRunAction,
  deleteWorkflowAction,
  runWorkflowAction,
} from "@/features/workflows/actions"
import { NodeIcon } from "@/features/workflows/components/node-icon"
import {
  useLiveRun,
  useWorkflowExecutionState,
} from "@/features/workflows/components/workflow-runs-provider"
import { Spinner } from "@/components/ui/spinner"
import { useProPlan } from "@/features/workflows/hooks/use-pro-plan"
import { useUpstreamConnections } from "@/features/workflows/hooks/use-upstream-connections"
import { validateGraph } from "@/features/workflows/lib/validate-graph"
import {
  nodeRegistry,
  type NodeDefinition,
  type NodeField,
  type NodeType,
  type StepNodeKind,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

// This file builds up to the RightSidebar component exported at the bottom: a
// header with workflow actions (delete, run), then two tabs — a Toolbar for
// adding nodes and an Editor for tweaking the selected node. Each helper below is
// defined just above the block that uses it.

// ---------------------------------------------------------------------------
// Shared pieces — used by both the Toolbar and the Editor.
// ---------------------------------------------------------------------------

// A titled, scrollable panel. Each tab renders its content inside one.
function Section({
  title,
  icon,
  description,
  children,
}: {
  title: string
  icon?: React.ReactNode
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border/80 bg-card/60 px-3.5 py-2.5 backdrop-blur-xs">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-foreground">{title}</h3>
            {description && (
              <p className="text-[10px] text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor tab — edits the fields of the selected node.
// ---------------------------------------------------------------------------

// A single editor field for a node property. Renders a multi-line textarea when
// the field opts in via `multiline`, otherwise a single-line input.
function Field({
  field,
  value,
  onChange,
  onFocus,
}: {
  field: NodeField
  value: string
  onChange: (value: string) => void
  // Fires when the field gains focus, so the Connections chips know which
  // field a clicked token should land in.
  onFocus: () => void
}) {
  if (field.multiline) {
    return (
      <Textarea
        id={field.key}
        value={value}
        placeholder={field.placeholder}
        onFocus={onFocus}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  return (
    <Input
      id={field.key}
      value={value}
      placeholder={field.placeholder}
      onFocus={onFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

// The Editor tab: one input per field on the selected node, or an empty state.
function Inspector({ node }: { node: StepNodeType | undefined }) {
  const { updateNodeData } = useReactFlow<StepNodeType>()
  // Outputs of every node upstream of the selected one, as insertable {{ }}
  // tokens. Empty when nothing feeds into this node.
  const connections = useUpstreamConnections()
  // The field a clicked chip inserts into — whichever was focused most recently.
  // Reset per selected node since this component is keyed by node id.
  const [activeFieldKey, setActiveFieldKey] = useState<string | null>(null)

  if (!node) {
    return (
      <Section title="Editor" description="Properties & parameters">
        <div className="flex h-72 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-muted/40 text-muted-foreground shadow-xs">
            <Sliders className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-foreground">No node selected</p>
            <p className="text-xs text-muted-foreground max-w-[210px] leading-relaxed">
              Select a step on the canvas to configure its properties and parameters.
            </p>
          </div>
        </div>
      </Section>
    )
  }

  const { type, title, values } = node.data
  const def: NodeDefinition = nodeRegistry[type]

  // Untouched fields fall back to the first one, so a chip always has a home.
  const targetKey = activeFieldKey ?? def.fields[0]?.key

  const insertToken = (token: string) => {
    if (!targetKey) return
    updateNodeData(node.id, {
      values: { ...values, [targetKey]: (values[targetKey] ?? "") + token },
    })
  }

  return (
    <Section title={title} description={def.description} icon={<NodeIcon type={type} />}>
      <div className="flex flex-col gap-3.5 p-3.5">
        {def.fields.length === 0 ? (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-center">
            <p className="text-xs text-muted-foreground">This step requires no configuration.</p>
          </div>
        ) : (
          def.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-xs font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              <Field
                field={field}
                value={values[field.key] ?? ""}
                onFocus={() => setActiveFieldKey(field.key)}
                onChange={(value) => {
                  updateNodeData(node.id, {
                    values: { ...values, [field.key]: value },
                  })
                }}
              />
            </div>
          ))
        )}

        {/* Available upstream outputs — click to drop a token into the last
            focused field (or the first field if none has been touched). */}
        {connections.length > 0 && (
          <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground">Available Variables</Label>
              <span className="text-[10px] text-muted-foreground">Click to insert</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {connections.map((connection) => (
                <button
                  key={connection.token}
                  type="button"
                  onClick={() => insertToken(connection.token)}
                  className="flex max-w-full items-center gap-1.5 rounded-md border border-border/80 bg-background/80 px-2 py-1 text-xs hover:bg-accent hover:border-accent transition-colors"
                >
                  <NodeIcon type={connection.nodeType} className="size-3.5" />
                  <span className="truncate font-mono text-[11px]">{connection.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Toolbar tab — adds nodes to the canvas, grouped by kind.
// ---------------------------------------------------------------------------

// The Toolbar's groups, one accordion section per node kind.
const sections: { kind: StepNodeKind; label: string }[] = [
  { kind: "trigger", label: "Triggers" },
  { kind: "action", label: "Actions" },
]

// Every node type from the registry, filtered into the groups below.
const definitions = Object.values(nodeRegistry)

// Node types that only orgs on the Pro plan can add. The Agent node is our most
// expensive node, so it's gated; every other node stays free to keep workflow
// building open to everyone.
const premiumNodes = new Set<NodeType>(["agent"])

// The Toolbar tab: a button per node type that adds it to the canvas.
function Palette() {
  // The shared React Flow store (lifted to a provider above the canvas and this
  // sidebar) lets us read the current nodes/viewport and add to them from here.
  const { getNodes, getViewport, addNodes } = useReactFlow<StepNodeType>()
  // The pane's measured size, used to find the center of the current view.
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)
  // Whether the active org is on Pro, plus a way to send them to upgrade. Gates
  // the premium nodes below.
  const { isLoaded, isPro, goToUpgrade } = useProPlan()

  // A premium node is locked until the plan check has loaded and confirms Pro.
  // We wait for `isLoaded` so a Pro org never flashes a locked state on mount.
  const isLocked = (type: NodeType) =>
    premiumNodes.has(type) && isLoaded && !isPro

  const add = (type: NodeType) => {
    // Premium nodes route to upgrade instead of being added for non-pro orgs.
    if (isLocked(type)) {
      goToUpgrade()
      return
    }

    const def = nodeRegistry[type]
    const nodes = getNodes()

    // Only one trigger is allowed — a workflow has a single entry point.
    if (def.kind === "trigger" && nodes.some((n) => n.data.kind === "trigger")) {
      toast.error("A workflow can only have one trigger.")
      return
    }

    // Number nodes of the same type (e.g. "Open URL 1", "Open URL 2") so
    // duplicates stay easy to tell apart.
    const count = nodes.filter((n) => n.data.type === type).length
    const title = `${def.label} ${count + 1}`

    // Drop the node in the middle of the current view. The viewport transform
    // maps a flow point p to the screen as p * zoom + {x, y}, so the pane center
    // in flow coordinates is (center - offset) / zoom.
    const { x, y, zoom } = getViewport()
    const position = {
      x: (width / 2 - x) / zoom,
      y: (height / 2 - y) / zoom,
    }

    addNodes({
      id: crypto.randomUUID(),
      type: "step",
      position,
      data: { type, kind: def.kind, title, values: {} },
    })
  }

  return (
    <Section title="Toolbar" description="Click or drag any step onto canvas">
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => s.kind)}
        className="px-2.5 py-1"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.kind}
            value={section.kind}
            className="border-b border-border/60 py-1"
          >
            <AccordionTrigger className="py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-1 pb-2">
              {definitions
                .filter((def) => def.kind === section.kind)
                .map((def) => {
                  const type = def.type as NodeType
                  const locked = isLocked(type)
                  return (
                    <button
                      key={def.type}
                      type="button"
                      draggable={!locked}
                      onDragStart={(e) => {
                        if (locked) return
                        e.dataTransfer.setData("application/reactflow", type)
                        e.dataTransfer.effectAllowed = "move"
                      }}
                      onClick={() => add(type)}
                      title={locked ? "Upgrade to Pro to add this node" : undefined}
                      className={cn(
                        "group flex w-full items-start gap-2.5 rounded-lg border border-transparent p-2 text-left transition-all hover:border-border hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring",
                        locked
                          ? "opacity-75 cursor-not-allowed"
                          : "cursor-grab active:cursor-grabbing"
                      )}
                    >
                      <NodeIcon type={type} className="mt-0.5" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                            {def.label}
                          </span>
                          {locked && (
                            <Lock className="size-3 text-muted-foreground" />
                          )}
                        </div>
                        <span className="line-clamp-2 text-[11px] text-muted-foreground leading-normal">
                          {def.description}
                        </span>
                      </div>
                    </button>
                  )
                })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Header — workflow-level actions shown above the tabs.
// ---------------------------------------------------------------------------

// The "..." menu for workflow-level actions.
function ActionsMenu({ workflowId }: { workflowId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
          onSelect={(e) => {
            // Keep the menu mounted while the delete runs so the disabled state
            // stays visible. Running inside a transition lets the router handle
            // the action's redirect home on success.
            e.preventDefault()
            startTransition(async () => {
              await deleteWorkflowAction(workflowId)
            })
          }}
        >
          <Trash2 />
          Delete workflow
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Toggles between running the current workflow and stopping the run in flight.
// While a run is live it becomes a Stop button that cancels that run; otherwise
// it validates the graph and kicks off a new run.
function RunButton({ workflowId }: { workflowId: string }) {
  const { getNodes, getEdges } = useReactFlow<StepNodeType>()
  const [isPending, startTransition] = useTransition()
  // The run in flight, if any. At most one is live at a time, so its presence
  // decides which mode the button is in.
  const liveRun = useLiveRun()
  const { refresh } = useWorkflowExecutionState()

  if (liveRun) {
    return (
      <Button
        size="sm"
        variant="destructive"
        disabled={isPending}
        className="h-8 gap-1.5 text-xs font-medium px-3 shadow-xs"
        onClick={() => {
          startTransition(async () => {
            try {
              await cancelWorkflowRunAction({
                workflowId,
                executionId: liveRun.id,
                runId: liveRun.triggerRunId ?? undefined,
              })
              await refresh()
              toast.info("Workflow execution cancelled.")
            } catch (err) {
              toast.error(
                err instanceof Error ? err.message : "Couldn't stop the run."
              )
            }
          })
        }}
      >
        {isPending ? (
          <Spinner className="size-3" />
        ) : (
          <Square className="size-3 fill-current" />
        )}
        {isPending ? "Stopping..." : "Stop"}
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="default"
      disabled={isPending}
      className="h-8 gap-1.5 text-xs font-medium px-3 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90"
      onClick={() => {
        const graph = { nodes: getNodes(), edges: getEdges() }
        const problems = validateGraph(graph, { runnable: true })
        if (problems.length > 0) {
          toast.error(problems[0])
          return
        }

        startTransition(async () => {
          try {
            await runWorkflowAction({ workflowId, graph })
            await refresh()
          } catch (err) {
            toast.error(
              err instanceof Error
                ? err.message
                : "Failed to start workflow execution."
            )
          }
        })
      }}
    >
      {isPending ? (
        <Spinner className="size-3" />
      ) : (
        <Play className="size-3 fill-current" />
      )}
      {isPending ? "Starting..." : "Run"}
    </Button>
  )
}

// ---------------------------------------------------------------------------
// The sidebar itself — header on top, then the Toolbar / Editor tabs.
// ---------------------------------------------------------------------------

export function RightSidebar({ workflowId }: { workflowId: string }) {
  const [tab, setTab] = useState("toolbar")

  // TODO: read the currently selected node from React Flow.
  const selected = useStore((s) => s.nodes.find((n) => n.selected)) as StepNodeType | undefined

  // TODO: auto-switch to the Editor tab when the selection changes.
  const [prevSelectedId, setPrevSelectedId] = useState(selected?.id)
  if (selected && selected.id !== prevSelectedId) {
    setPrevSelectedId(selected.id)
    setTab("editor")
  }

  return (
    <div className="flex size-full min-h-0 flex-col border-l border-border bg-card">
      <Tabs value={tab} onValueChange={setTab} className="flex size-full min-h-0 flex-col gap-0">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-2.5 py-2">
          <TabsList className="h-8 w-44 grid grid-cols-2 bg-muted/60 p-0.5">
            <TabsTrigger
              value="toolbar"
              className="h-7 rounded-sm text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Toolbar
            </TabsTrigger>
            <TabsTrigger
              value="editor"
              className="h-7 rounded-sm text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              Editor
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1.5">
            <ActionsMenu workflowId={workflowId} />
            <RunButton workflowId={workflowId} />
          </div>
        </div>
        <TabsContent value="toolbar" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <Palette />
        </TabsContent>
        <TabsContent value="editor" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <Inspector key={selected?.id} node={selected} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
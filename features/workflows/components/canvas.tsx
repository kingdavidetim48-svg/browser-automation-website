"use client"

import * as React from "react"
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from "@xyflow/react"
import { Check, Pencil, Play, Save, X } from "lucide-react"
import { toast } from "sonner"
import { WorkflowToolbar } from "./toolbar"
import { useWorkflows } from "../hooks/use-workflows"
import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "../nodes/node-registry"
import { validateGraph } from "../lib/validate-graph"
import {
  getWorkflowRunStatusAction,
  runWorkflowAction,
  saveWorkflowGraphAction,
} from "../actions"
import type { WorkflowGraph } from "@/lib/db/schema"

function WorkflowNode({
  data,
  selected,
}: {
  data: StepNodeType["data"]
  selected: boolean
}) {
  const definition = nodeRegistry[data.type]
  const Icon = definition.icon
  return (
    <div
      className={
        "relative min-w-48 rounded-xl border bg-[#222224] p-3 text-white shadow-xl " +
        (selected
          ? "border-blue-400 ring-1 ring-blue-400/50"
          : "border-neutral-700")
      }
    >
      {data.type !== "start" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-3 !bg-neutral-400"
        />
      )}
      <div className="flex items-center gap-2.5">
        <span
          className={
            "flex size-8 items-center justify-center rounded-lg " +
            definition.accent
          }
        >
          <Icon className="size-4" />
        </span>
        <span className="text-sm font-medium">{data.title}</span>
      </div>
      {definition.fields.map((field) => (
        <div
          key={field.key}
          className="mt-2 max-w-64 truncate text-xs text-neutral-400"
        >
          {data.values[field.key] || field.placeholder || "Not configured"}
        </div>
      ))}
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !bg-blue-400"
      />
    </div>
  )
}

const nodeTypes = { step: WorkflowNode }

type WorkflowCanvasProps = {
  workflow: { id: string; name: string; graph: WorkflowGraph }
}

function EditorCanvas({ workflow }: WorkflowCanvasProps) {
  const { renameWorkflow } = useWorkflows()
  const [graph, setGraph] = React.useState(workflow.graph)
  const [nodes, setNodes, onNodesChange] = useNodesState<StepNodeType>(
    workflow.graph.nodes
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(
    workflow.graph.edges
  )
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(
    null
  )
  const [panelTab, setPanelTab] = React.useState<"toolbar" | "editor">(
    "toolbar"
  )
  const [running, setRunning] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)
  const [workflowName, setWorkflowName] = React.useState(workflow.name)
  const [nameDraft, setNameDraft] = React.useState(workflow.name)
  const [isRenaming, setIsRenaming] = React.useState(false)
  const [isRenamingSaving, setIsRenamingSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [runMessage, setRunMessage] = React.useState("")
  const [activeRun, setActiveRun] = React.useState<{
    runId: string
    workflowId: string
  } | null>(null)
  const editRevision = React.useRef(0)

  React.useEffect(() => {
    if (!activeRun) return
    let cancelled = false
    const poll = async () => {
      try {
        const result = await getWorkflowRunStatusAction(activeRun)
        if (cancelled) return
        const label =
          result.status === "completed"
            ? "completed"
            : result.status === "failed"
              ? "failed"
              : result.status === "running"
                ? "running"
                : "queued"
        setRunMessage(
          "Run " + label + (result.error ? ": " + result.error : "")
        )
        if (result.terminal) setActiveRun(null)
      } catch (cause) {
        if (!cancelled) {
          setRunMessage(
            cause instanceof Error
              ? "Run status unavailable: " + cause.message
              : "Run status unavailable."
          )
          setActiveRun(null)
        }
      }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 2500)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeRun])

  const commit = React.useCallback(
    (
      nextNodes: StepNodeType[],
      nextEdges: Edge[],
      viewport = graph?.viewport
    ) => {
      const next = {
        nodes: nextNodes,
        edges: nextEdges,
        ...(viewport ? { viewport } : {}),
      }
      setNodes(nextNodes)
      setEdges(nextEdges)
      setGraph(next)
      editRevision.current++
      setDirty(true)
    },
    [graph?.viewport, setEdges, setGraph, setNodes]
  )

  const addNode = (type: NodeType) => {
    if (type === "start") return
    const definition = nodeRegistry[type]
    const position = nodes.reduce(
      (point, node) => ({
        x: Math.max(point.x, node.position.x + 260),
        y: point.y,
      }),
      { x: 80, y: 180 }
    )
    const node: StepNodeType = {
      id: crypto.randomUUID(),
      type: "step",
      position,
      data: {
        type,
        kind: definition.kind,
        title: definition.label,
        values: {},
      },
    }
    commit([...nodes, node], edges)
    setSelectedNodeId(node.id)
    setPanelTab("editor")
  }

  const deleteNode = (id: string) => {
    const node = nodes.find((item) => item.id === id)
    if (!node || node.data.type === "start") return
    commit(
      nodes.filter((item) => item.id !== id),
      edges.filter((edge) => edge.source !== id && edge.target !== id)
    )
    setSelectedNodeId(null)
  }

  const updateField = (id: string, key: string, value: string) => {
    const nextNodes = nodes.map((node) =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              values: { ...node.data.values, [key]: value },
            },
          }
        : node
    )
    commit(nextNodes, edges)
  }

  const connect = (connection: Connection) =>
    commit(nodes, addEdge({ ...connection, id: crypto.randomUUID() }, edges))

  const save = async () => {
    const revisionAtSave = editRevision.current
    const graphToSave = { ...graph, nodes, edges }
    setIsSaving(true)
    setSaveError(null)
    try {
      await saveWorkflowGraphAction({ id: workflow.id, graph: graphToSave })
      if (editRevision.current === revisionAtSave) setDirty(false)
      toast.success("Workflow saved.")
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Could not save workflow."
      setSaveError(message)
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const rename = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsRenamingSaving(true)
    try {
      const name = await renameWorkflow(workflow.id, nameDraft)
      setWorkflowName(name)
      setNameDraft(name)
      setIsRenaming(false)
      toast.success("Workflow renamed.")
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : "Could not rename workflow."
      )
    } finally {
      setIsRenamingSaving(false)
    }
  }

  const run = async () => {
    const currentGraph = {
      ...graph,
      nodes,
      edges,
    }
    const problems = validateGraph(currentGraph)
    if (problems.length) {
      toast.error(problems[0])
      setRunMessage(problems.join(" "))
      return
    }
    setRunning(true)
    const revisionAtRun = editRevision.current
    setRunMessage("Queueing workflow…")
    try {
      const handle = await runWorkflowAction({
        id: workflow.id,
        graph: currentGraph,
      })
      if (editRevision.current === revisionAtRun) setDirty(false)
      setActiveRun({ runId: handle.id, workflowId: workflow.id })
      setRunMessage("Run queued")
      toast.success("Workflow queued.")
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "Workflow could not be queued."
      setRunMessage(message)
      toast.error(message)
    } finally {
      setRunning(false)
    }
  }

  const currentGraph = { ...graph, nodes, edges }
  const graphProblems = validateGraph(currentGraph)

  return (
    <div className="flex min-w-0 flex-1 bg-[#141416]">
      <main className="relative min-w-0 flex-1">
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-[#161619]/95 px-4 py-2 backdrop-blur">
          <div className="min-w-0">
            {isRenaming ? (
              <form onSubmit={(event) => void rename(event)} className="flex gap-1.5">
                <input
                  autoFocus
                  required
                  maxLength={256}
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  aria-label="Workflow name"
                  className="h-7 w-56 rounded border border-neutral-700 bg-neutral-900 px-2 text-sm text-white outline-none focus:border-blue-400"
                />
                <button
                  type="submit"
                  disabled={isRenamingSaving}
                  className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  aria-label="Save workflow name"
                >
                  <Check className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameDraft(workflowName)
                    setIsRenaming(false)
                  }}
                  className="rounded p-1 text-neutral-400 hover:bg-neutral-800"
                  aria-label="Cancel rename"
                >
                  <X className="size-4" />
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-sm font-semibold text-white">
                  {workflowName}
                </h1>
                <button
                  type="button"
                  onClick={() => setIsRenaming(true)}
                  className="rounded p-1 text-neutral-500 hover:bg-neutral-800 hover:text-white"
                  aria-label="Rename workflow"
                  title="Rename workflow"
                >
                  <Pencil className="size-3" />
                </button>
              </div>
            )}
            <p className="truncate text-[11px] text-neutral-500">
              {isSaving
                ? "Saving changes…"
                : saveError
                  ? `Save failed: ${saveError}`
                  : dirty
                    ? "Unsaved changes"
                    : "All changes saved"}
              {runMessage
                ? " · " + runMessage
                : graphProblems.length
                  ? " · Cannot run: " + graphProblems[0]
                  : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => void save()}
              disabled={!dirty || isSaving}
              className="flex items-center gap-1.5 rounded-md border border-neutral-700 px-2.5 py-1.5 text-xs text-neutral-200 disabled:opacity-40"
            >
              <Save className="size-3.5" />
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={run}
              disabled={running}
              className="flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              <Play className="size-3.5" />
              {running ? "Queueing…" : "Run"}
            </button>
          </div>
        </div>
        <ReactFlow
          key={workflow.id}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={(changes) => {
            const filtered = changes.filter(
              (change) =>
                change.type !== "remove" ||
                nodes.find((node) => node.id === change.id)?.data.type !==
                  "start"
            )
            const nextNodes = applyNodeChanges(
              filtered,
              nodes
            ) as StepNodeType[]
            onNodesChange(filtered)
            if (
              filtered.some(
                (change) =>
                  change.type !== "select" && change.type !== "dimensions"
              )
            ) {
              setGraph({
                nodes: nextNodes,
                edges,
                ...(graph?.viewport ? { viewport: graph.viewport } : {}),
              })
              editRevision.current++
              setDirty(true)
            }
          }}
          onEdgesChange={(changes) => {
            const nextEdges = applyEdgeChanges(changes, edges)
            onEdgesChange(changes)
            if (changes.some((change) => change.type !== "select")) {
              setGraph({
                nodes,
                edges: nextEdges,
                ...(graph?.viewport ? { viewport: graph.viewport } : {}),
              })
              editRevision.current++
              setDirty(true)
            }
          }}
          onConnect={connect}
          onNodeClick={(_, node) => {
            setSelectedNodeId(node.id)
            setPanelTab("editor")
          }}
          onPaneClick={() => setSelectedNodeId(null)}
          onMoveEnd={(_, viewport) => {
            setGraph((current) => ({ ...current, nodes, edges, viewport }))
            editRevision.current++
            setDirty(true)
          }}
          defaultViewport={graph?.viewport ?? { x: 0, y: 0, zoom: 1 }}
          deleteKeyCode={["Backspace", "Delete"]}
          proOptions={{ hideAttribution: true }}
          className="bg-[#141416] pt-14"
        >
          <Background color="#888" gap={22} size={1} />
          <Controls position="bottom-left" />
          <MiniMap
            position="bottom-right"
            nodeColor={(node) =>
              node.data.type === "start" ? "#3b82f6" : "#737373"
            }
          />
        </ReactFlow>
        {nodes.every((node) => node.data.type === "start") && (
          <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center pt-14">
            <div className="pointer-events-auto max-w-sm rounded-2xl border border-neutral-700/80 bg-[#1b1b1f]/95 p-6 text-center shadow-2xl backdrop-blur">
              <h2 className="text-base font-semibold text-white">
                Start building your workflow
              </h2>
              <p className="mt-2 text-sm text-neutral-400">
                Add an action, connect it to Start, and configure what it should do.
              </p>
              <button
                type="button"
                onClick={() => addNode("open-url")}
                className="mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
              >
                Add your first action
              </button>
            </div>
          </div>
        )}
      </main>
      <WorkflowToolbar
        selectedNodeId={selectedNodeId}
        activeTab={panelTab}
        onActiveTabChange={setPanelTab}
        nodes={nodes}
        edges={edges}
        onAddNode={addNode}
        onDeleteNode={deleteNode}
        onUpdateField={updateField}
      />
    </div>
  )
}

export function WorkflowCanvas({ workflow }: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <EditorCanvas key={workflow.id} workflow={workflow} />
    </ReactFlowProvider>
  )
}

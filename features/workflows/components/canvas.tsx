"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ConnectionLineType,
  useReactFlow,
  type ColorMode,
  type Connection,
  type Edge,
  NodeTypes,
  Panel,
} from "@xyflow/react"
import { useLiveblocksFlow, Cursors } from "@liveblocks/react-flow"
import { useUndo, useRedo, useCanUndo, useCanRedo } from "@liveblocks/react"
import { AvatarStack } from "@liveblocks/react-ui"
import { LayoutGrid, Redo2, Undo2, Workflow } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { StepNode } from "@/features/workflows/components/step-node"
import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

import "@xyflow/react/dist/style.css"
import "@liveblocks/react-ui/styles.css"
import "@liveblocks/react-flow/styles.css"

const nodeTypes: NodeTypes = { step: StepNode }

const initialNodes: StepNodeType[] = [
  {
    id: "start",
    type: "step",
    position: { x: 100, y: 100 },
    data: { type: "start", kind: "trigger", title: "Start", values: {} },
  },
]

const initialEdges: Edge[] = []

const emptySubscribe = () => () => {}

// False during server render and hydration, true after mount. Keeps the
// server and initial client render identical to avoid a hydration mismatch.
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function Canvas() {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const colorMode: ColorMode = mounted
    ? ((resolvedTheme as ColorMode) ?? "light")
    : "light"

  const undo = useUndo()
  const redo = useRedo()
  const canUndo = useCanUndo()
  const canRedo = useCanRedo()

  const {
    screenToFlowPosition,
    addNodes,
    setNodes,
    deleteElements,
    fitView,
  } = useReactFlow<StepNodeType>()

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow({
      suspense: true,
      nodes: { initial: initialNodes },
      edges: { initial: initialEdges },
    })

  // Drag-and-drop node creation
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const type = event.dataTransfer.getData("application/reactflow") as NodeType
      if (!type || !nodeRegistry[type]) return

      const def = nodeRegistry[type]

      // Enforce single trigger rule
      if (
        def.kind === "trigger" &&
        nodes.some((n: StepNodeType) => n.data.kind === "trigger")
      ) {
        toast.error("A workflow can only have one trigger.")
        return
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      const count = nodes.filter((n: StepNodeType) => n.data.type === type).length
      const title = `${def.label} ${count + 1}`

      addNodes({
        id: crypto.randomUUID(),
        type: "step",
        position,
        data: { type, kind: def.kind, title, values: {} },
      })
    },
    [nodes, screenToFlowPosition, addNodes]
  )

  // Connection validation: prevent self-connections, duplicate edges, connections to Start, and cycles
  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (!connection.source || !connection.target) return false

      // 1. Prevent self-connections
      if (connection.source === connection.target) return false

      // 2. Prevent connections into Start / Trigger nodes
      const targetNode = nodes.find((n: StepNodeType) => n.id === connection.target)
      if (targetNode?.data.type === "start" || targetNode?.data.kind === "trigger") {
        return false
      }

      // 3. Prevent duplicate connections between same endpoints
      const isDuplicate = edges.some(
        (e: Edge) =>
          e.source === connection.source && e.target === connection.target
      )
      if (isDuplicate) return false

      // 4. Cycle check: ensure target cannot already reach source
      const visited = new Set<string>()
      const queue = [connection.target]
      while (queue.length > 0) {
        const curr = queue.shift()!
        if (curr === connection.source) {
          return false
        }
        if (!visited.has(curr)) {
          visited.add(curr)
          for (const edge of edges as Edge[]) {
            if (edge.source === curr && !visited.has(edge.target)) {
              queue.push(edge.target)
            }
          }
        }
      }

      return true
    },
    [nodes, edges]
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) {
        toast.error("Invalid connection")
        return
      }
      onConnect(connection)
    },
    [isValidConnection, onConnect]
  )

  // Automatic clean left-to-right hierarchical layout
  const autoLayout = useCallback(() => {
    if (nodes.length === 0) return

    // Build graph structure
    const outgoing = new Map<string, string[]>()
    const inDegree = new Map<string, number>()
    for (const n of nodes as StepNodeType[]) {
      outgoing.set(n.id, [])
      inDegree.set(n.id, 0)
    }
    for (const e of edges as Edge[]) {
      if (outgoing.has(e.source) && inDegree.has(e.target)) {
        outgoing.get(e.source)!.push(e.target)
        inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1)
      }
    }

    // Roots: start/trigger nodes first, or nodes with in-degree 0
    const startNodes = (nodes as StepNodeType[]).filter(
      (n: StepNodeType) => n.data.type === "start" || n.data.kind === "trigger"
    )
    const roots =
      startNodes.length > 0
        ? startNodes
        : (nodes as StepNodeType[]).filter(
            (n: StepNodeType) => (inDegree.get(n.id) ?? 0) === 0
          )
    if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0] as StepNodeType)

    const ranks = new Map<string, number>()
    for (const r of roots) {
      ranks.set(r.id, 0)
    }

    const queue = [...roots.map((r) => r.id)]
    while (queue.length > 0) {
      const u = queue.shift()!
      const uRank = ranks.get(u) ?? 0
      for (const v of outgoing.get(u) ?? []) {
        const vRank = ranks.get(v) ?? 0
        if (uRank + 1 > vRank) {
          ranks.set(v, uRank + 1)
          queue.push(v)
        }
      }
    }

    // Place remaining disconnected nodes in subsequent ranks
    let maxRank = 0
    Array.from(ranks.values()).forEach((r: number) => {
      if (r > maxRank) maxRank = r
    })
    let nextDisconnectedRank = maxRank + 1
    for (const n of nodes as StepNodeType[]) {
      if (!ranks.has(n.id)) {
        ranks.set(n.id, nextDisconnectedRank++)
      }
    }

    // Group nodes by rank
    const rankGroups = new Map<number, string[]>()
    for (const [id, rank] of ranks.entries()) {
      if (!rankGroups.has(rank)) rankGroups.set(rank, [])
      rankGroups.get(rank)!.push(id)
    }

    const HORIZONTAL_STEP = 360
    const VERTICAL_STEP = 150
    const ORIGIN_X = 80
    const ORIGIN_Y = 220

    const sortedRanks = Array.from(rankGroups.keys()).sort((a, b) => a - b)
    const newPositions = new Map<string, { x: number; y: number }>()

    for (const rank of sortedRanks) {
      const nodeIds = rankGroups.get(rank)!
      const count = nodeIds.length
      const x = ORIGIN_X + rank * HORIZONTAL_STEP

      nodeIds.forEach((id, index) => {
        const y = ORIGIN_Y + (index - (count - 1) / 2) * VERTICAL_STEP
        newPositions.set(id, { x, y })
      })
    }

    setNodes((currentNodes) =>
      currentNodes.map((n: StepNodeType) => {
        const pos = newPositions.get(n.id)
        return pos ? { ...n, position: pos } : n
      })
    )

    setTimeout(() => {
      fitView({ padding: 0.35 })
    }, 50)

    toast.success("Workflow auto-organized")
  }, [nodes, edges, setNodes, fitView])

  // Keyboard shortcuts: Undo, Redo, Duplicate, Delete
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable ||
          target.closest("input, textarea, [contenteditable='true']"))
      ) {
        return
      }

      const isCtrlOrMeta = event.ctrlKey || event.metaKey

      // Undo: Ctrl+Z / Cmd+Z
      if (isCtrlOrMeta && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault()
        if (canUndo) undo()
        return
      }

      // Redo: Ctrl+Y / Cmd+Y or Ctrl+Shift+Z / Cmd+Shift+Z
      if (
        isCtrlOrMeta &&
        (event.key.toLowerCase() === "y" ||
          (event.shiftKey && event.key.toLowerCase() === "z"))
      ) {
        event.preventDefault()
        if (canRedo) redo()
        return
      }

      // Duplicate: Ctrl+D / Cmd+D
      if (isCtrlOrMeta && event.key.toLowerCase() === "d") {
        event.preventDefault()
        const selectedNodes = (nodes as StepNodeType[]).filter(
          (n: StepNodeType) =>
            n.selected && n.data.type !== "start" && n.data.kind !== "trigger"
        )
        if (selectedNodes.length > 0) {
          const newNodes = selectedNodes.map((n: StepNodeType) => ({
            id: crypto.randomUUID(),
            type: "step" as const,
            position: { x: n.position.x + 30, y: n.position.y + 30 },
            selected: true,
            data: {
              ...n.data,
              title: `${n.data.title} (Copy)`,
              values: { ...n.data.values },
            },
          }))

          setNodes((nds) =>
            nds.map((n: StepNodeType) =>
              n.selected ? { ...n, selected: false } : n
            )
          )
          addNodes(newNodes)
          toast.success(
            `Duplicated ${selectedNodes.length} step${selectedNodes.length > 1 ? "s" : ""}`
          )
        }
        return
      }

      // Delete: Delete or Backspace
      if (event.key === "Delete" || event.key === "Backspace") {
        const selectedNodes = (nodes as StepNodeType[]).filter(
          (n: StepNodeType) =>
            n.selected && n.data.type !== "start" && n.data.kind !== "trigger"
        )
        const selectedEdges = (edges as Edge[]).filter((e: Edge) => e.selected)
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          event.preventDefault()
          deleteElements({
            nodes: selectedNodes.map((n: StepNodeType) => ({ id: n.id })),
            edges: selectedEdges.map((e: Edge) => ({ id: e.id })),
          })
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [nodes, edges, undo, redo, canUndo, canRedo, addNodes, setNodes, deleteElements])

  return (
    <div className="relative size-full">
      <ReactFlow
        nodeTypes={nodeTypes}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDelete={onDelete}
        onDragOver={onDragOver}
        onDrop={onDrop}
        isValidConnection={isValidConnection}
        colorMode={colorMode}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        snapToGrid={true}
        snapGrid={[20, 20]}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: "var(--border)", strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--border)", strokeWidth: 2 },
        }}
        style={
          {
            "--xy-background-color": "var(--background)",
            "--xy-edge-stroke-width": 2,
            "--xy-connectionline-stroke-width": 2,
            "--xy-background-pattern-color": "var(--border)",
          } as React.CSSProperties
        }
        maxZoom={1.5}
        minZoom={0.3}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.5} />
        <Controls position="bottom-left" className="m-3 shadow-md" />
        <Cursors />

        {/* Top-Left Canvas Action Bar */}
        <Panel
          position="top-left"
          className="m-3 flex items-center gap-1 rounded-xl border border-border/80 bg-card/90 p-1 shadow-md backdrop-blur-md"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canUndo}
            onClick={() => undo()}
            title="Undo (Ctrl+Z)"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={!canRedo}
            onClick={() => redo()}
            title="Redo (Ctrl+Y)"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <Redo2 className="size-4" />
          </Button>
          <div className="mx-0.5 h-4 w-px bg-border/80" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={autoLayout}
            title="Auto Layout (Organize Nodes)"
            className="h-8 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground gap-1.5"
          >
            <LayoutGrid className="size-3.5 text-primary" />
            <span>Auto Layout</span>
          </Button>
        </Panel>

        {/* Top-Right Liveblocks Avatar Presence */}
        <Panel position="top-right" className="m-3">
          <AvatarStack />
        </Panel>

        {/* Empty State Guidance Watermark */}
        {nodes.length <= 1 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/40 bg-card/20 px-6 py-5 text-center backdrop-blur-xs">
              <div className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-muted/30 text-muted-foreground/70">
                <Workflow className="size-5" />
              </div>
              <p className="text-xs font-medium text-muted-foreground/80">
                Drag steps from the toolbar to start building
              </p>
              <p className="max-w-[260px] text-[11px] text-muted-foreground/60">
                Connect handles from Left to Right. Use Ctrl+Z / Ctrl+Y to undo/redo changes.
              </p>
            </div>
          </div>
        )}
      </ReactFlow>
    </div>
  )
}

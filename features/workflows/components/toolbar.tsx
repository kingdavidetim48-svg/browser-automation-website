"use client"

import * as React from "react"
import { ChevronUp, Trash2 } from "lucide-react"
import { cn } from "cn"
import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "../nodes/node-registry"
import type { Edge } from "@xyflow/react"

export function WorkflowToolbar({
  className,
  selectedNodeId,
  activeTab,
  onActiveTabChange,
  nodes,
  edges,
  onAddNode,
  onDeleteNode,
  onUpdateField,
}: {
  className?: string
  selectedNodeId: string | null
  activeTab: "toolbar" | "editor"
  onActiveTabChange: (tab: "toolbar" | "editor") => void
  nodes: StepNodeType[]
  edges: Edge[]
  onAddNode: (type: NodeType) => void
  onDeleteNode: (id: string) => void
  onUpdateField: (id: string, key: string, value: string) => void
}) {
  const [actionsOpen, setActionsOpen] = React.useState(true)
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const definition = selectedNode ? nodeRegistry[selectedNode.data.type] : null
  const upstreamIds = new Set<string>()
  if (selectedNode) {
    const outgoing = new Map<string, string[]>()
    for (const edge of edges)
      outgoing.set(edge.source, [
        ...(outgoing.get(edge.source) ?? []),
        edge.target,
      ])
    for (const candidate of nodes) {
      const pending = [candidate.id]
      const visited = new Set<string>()
      while (pending.length) {
        const current = pending.pop()!
        if (visited.has(current)) continue
        visited.add(current)
        if (current === selectedNode.id && candidate.id !== selectedNode.id) {
          upstreamIds.add(candidate.id)
          break
        }
        pending.push(...(outgoing.get(current) ?? []))
      }
    }
  }

  const updateField = (key: string, value: string) => {
    if (!selectedNode) return
    onUpdateField(selectedNode.id, key, value)
  }

  const actionNodes = Object.values(nodeRegistry).filter(
    (entry) => entry.kind === "action"
  )
  return (
    <aside
      className={cn(
        "flex w-72 shrink-0 flex-col border-l border-neutral-800/80 bg-[#141416]",
        className
      )}
    >
      <div className="flex items-center gap-1 border-b border-neutral-800/60 p-3">
        <button
          onClick={() => onActiveTabChange("toolbar")}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium",
            activeTab === "toolbar"
              ? "bg-[#242426] text-white"
              : "text-neutral-400"
          )}
        >
          Add node
        </button>
        <button
          onClick={() => onActiveTabChange("editor")}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium",
            activeTab === "editor"
              ? "bg-[#242426] text-white"
              : "text-neutral-400"
          )}
        >
          Configure
        </button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {activeTab === "toolbar" ? (
          <>
            <div className="text-xs text-neutral-500">
              Click to add an action to the canvas.
            </div>
            <section className="space-y-2">
              <button
                onClick={() => setActionsOpen((open) => !open)}
                className="flex w-full items-center justify-between text-xs font-medium text-neutral-400"
              >
                <span>Actions</span>
                <ChevronUp
                  className={cn("size-3.5", !actionsOpen && "rotate-180")}
                />
              </button>
              {actionsOpen &&
                actionNodes.map((entry) => {
                  const Icon = entry.icon
                  return (
                    <button
                      key={entry.type}
                      onClick={() => onAddNode(entry.type as NodeType)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-300 hover:bg-neutral-800/70 hover:text-white"
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-md",
                          entry.accent
                        )}
                      >
                        <Icon className="size-3.5" />
                      </span>
                      {entry.label}
                    </button>
                  )
                })}
            </section>
          </>
        ) : selectedNode && definition ? (
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {definition.label}
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                {definition.description}
              </p>
            </div>
            {definition.fields.length === 0 && (
              <p className="text-xs text-neutral-400">
                The Start trigger has no configuration.
              </p>
            )}
            {definition.fields.map((field) => (
              <label key={field.key} className="block space-y-1.5">
                <span className="text-xs text-neutral-300">
                  {field.label}
                  {field.required ? " *" : ""}
                </span>
                {"multiline" in field && field.multiline ? (
                  <textarea
                    value={selectedNode.data.values[field.key] ?? ""}
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    rows={4}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-sm text-white placeholder:text-neutral-600"
                  />
                ) : (
                  <input
                    value={selectedNode.data.values[field.key] ?? ""}
                    onChange={(event) =>
                      updateField(field.key, event.target.value)
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-2.5 py-2 text-sm text-white placeholder:text-neutral-600"
                  />
                )}
                <span className="block text-[11px] text-neutral-500">
                  Use {"{{nodeId.outputPath}}"} to insert an upstream node
                  output.
                </span>
                {nodes
                  .filter((node) => upstreamIds.has(node.id))
                  .flatMap((node) =>
                    nodeRegistry[node.data.type].outputs.map((output) => (
                      <button
                        type="button"
                        key={node.id + "-" + output.path}
                        onClick={() =>
                          updateField(
                            field.key,
                            "{{" + node.id + "." + output.path + "}}"
                          )
                        }
                        className="mt-1 mr-1 rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300 hover:bg-neutral-700"
                      >
                        {node.data.title}.{output.path}
                      </button>
                    ))
                  )}
              </label>
            ))}
            {selectedNode.data.type !== "start" && (
              <button
                onClick={() => onDeleteNode(selectedNode.id)}
                className="flex items-center gap-2 rounded-md border border-red-900/60 px-2 py-1.5 text-xs text-red-300 hover:bg-red-950/40"
              >
                <Trash2 className="size-3.5" />
                Delete node
              </button>
            )}
          </section>
        ) : (
          <div className="text-xs text-neutral-400">
            Select a node on the canvas to configure it.
          </div>
        )}
      </div>
    </aside>
  )
}

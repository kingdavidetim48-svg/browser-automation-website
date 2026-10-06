import toposort from "toposort"

import type { WorkflowGraph } from "@/lib/db/schema"
import { nodeRegistry } from "@/features/workflows/nodes/node-registry"

// Structural problems knowable before a run — empty array means runnable. Pure
// (no db import) so the client can pre-flight the in-hand graph and toast,
// while the server reuses it as the save-time backstop.
export function validateGraph({ nodes, edges }: WorkflowGraph): string[] {
  const problems: string[] = []

  const nodeIds = new Set<string>()
  for (const node of nodes) {
    if (nodeIds.has(node.id)) {
      problems.push(`Node id "${node.id}" is duplicated.`)
    }
    nodeIds.add(node.id)

    const definition = nodeRegistry[node.data.type]
    if (!definition) {
      problems.push(`Node "${node.id}" has an unknown type.`)
      continue
    }
    if (node.data.kind !== definition.kind) {
      problems.push(`Node "${node.id}" has a kind that does not match its type.`)
    }

    for (const field of definition.fields) {
      if (field.required && !node.data.values[field.key]?.trim()) {
        problems.push(`${definition.label} requires a value for ${field.label}.`)
      }
    }
  }

  const triggers = nodes.filter((n) => nodeRegistry[n.data.type]?.kind === "trigger").length
  if (triggers !== 1) {
    problems.push(`A workflow needs exactly one Start trigger (found ${triggers}).`)
  }

  // The runner only executes nodes touching an edge, so with none Run is a no-op.
  if (edges.length === 0) {
    problems.push("Connect your nodes before running.")
  } else {
    const unknownEndpoint = edges.find(
      (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
    )
    if (unknownEndpoint) {
      problems.push("A workflow connection points to a node that does not exist.")
    }
    try {
      // toposort throws on a cycle — the run would otherwise fail mid-sort.
      if (!unknownEndpoint) toposort(edges.map((e) => [e.source, e.target]))
    } catch {
      problems.push("Workflow has a cycle — remove the loop before running.")
    }

    const start = nodes.find((node) => node.data.type === "start")
    if (start && !unknownEndpoint) {
      const outgoing = new Map<string, string[]>()
      for (const edge of edges) {
        outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target])
      }

      const reachable = new Set<string>([start.id])
      const pending = [start.id]
      while (pending.length > 0) {
        const source = pending.pop()!
        for (const target of outgoing.get(source) ?? []) {
          if (!reachable.has(target)) {
            reachable.add(target)
            pending.push(target)
          }
        }
      }

      if (edges.some((edge) => !reachable.has(edge.source) || !reachable.has(edge.target))) {
        problems.push("Every connected node must be reachable from the Start trigger.")
      }
    }
  }

  return problems
}

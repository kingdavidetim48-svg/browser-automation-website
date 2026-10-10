import toposort from "toposort"

import type { WorkflowGraph } from "@/lib/db/schema"
import { nodeRegistry } from "@/features/workflows/nodes/node-registry"

// Structural problems knowable before a run — empty array means runnable. Pure
// (no db import) so the client can pre-flight the in-hand graph and toast,
// while the server reuses it as the save-time backstop.
export function validateGraph(
  graph: WorkflowGraph,
  { runnable = true }: { runnable?: boolean } = {}
): string[] {
  const problems: string[] = []
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return ["Workflow graph must contain node and edge arrays."]
  }
  const { nodes, edges } = graph

  const nodeIds = new Set<string>()
  const nodeById = new Map<string, (typeof nodes)[number]>()
  const validNodes: (typeof nodes)[number][] = []
  for (const node of nodes) {
    if (
      !node ||
      typeof node.id !== "string" ||
      !node.id ||
      !node.data ||
      !node.position
    ) {
      problems.push("Workflow contains a malformed node.")
      continue
    }
    validNodes.push(node)
    if (
      node.type !== "step" ||
      !Number.isFinite(node.position.x) ||
      !Number.isFinite(node.position.y)
    ) {
      problems.push(
        "Workflow contains a node with an invalid React Flow type or position."
      )
    }
    if (typeof node.data.title !== "string" || !node.data.title.trim()) {
      problems.push(`Node "${node.id}" needs a title.`)
    }
    if (nodeIds.has(node.id)) {
      problems.push(`Node id "${node.id}" is duplicated.`)
    }
    nodeIds.add(node.id)
    nodeById.set(node.id, node)

    const definition = nodeRegistry[node.data.type as keyof typeof nodeRegistry]
    if (!definition) {
      problems.push(`Node "${node.id}" has an unknown type.`)
      continue
    }
    if (node.data.kind !== definition.kind) {
      problems.push(
        `Node "${node.id}" has a kind that does not match its type.`
      )
    }

    const values = node.data.values
    if (!values || typeof values !== "object" || Array.isArray(values)) {
      problems.push(`${definition.label} has malformed configuration.`)
      continue
    }
    for (const key of Object.keys(values)) {
      if (!definition.fields.some((field) => field.key === key)) {
        problems.push(
          `${definition.label} has an unsupported configuration field: ${key}.`
        )
      } else if (typeof values[key] !== "string") {
        problems.push(
          `${definition.label} configuration field ${key} must be text.`
        )
      }
    }

    for (const field of definition.fields) {
      const value = values[field.key]
      if (typeof value !== "string") {
        if (field.required && runnable) {
          problems.push(
            `${definition.label} requires a value for ${field.label}.`
          )
        }
        continue
      }
      if (field.required && runnable && !value.trim()) {
        problems.push(
          `${definition.label} requires a value for ${field.label}.`
        )
      }

      if (!runnable || !value.trim()) continue
      if (node.data.type === "open-url" && field.key === "url") {
        const dynamicUrl = /^\{\{\s*([^.{}]+)\.url\s*\}\}$/.test(value.trim())
        if (!dynamicUrl) {
          try {
            const url = new URL(
              value.replace(/\{\{[^}]+\}\}/g, "reference.invalid")
            )
            if (url.protocol !== "https:" && url.protocol !== "http:")
              throw new Error()
          } catch {
            problems.push("Open URL requires a valid http or https URL.")
          }
        }
      }
      if (
        node.data.type === "send-email" &&
        field.key === "to" &&
        !value.includes("{{")
      ) {
        if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(value.trim())) {
          problems.push("Send Email requires a valid recipient email address.")
        }
      }
    }
  }

  const triggers = validNodes.filter(
    (n) =>
      nodeRegistry[n.data?.type as keyof typeof nodeRegistry]?.kind ===
      "trigger"
  ).length
  if (runnable && triggers !== 1) {
    problems.push(
      `A workflow needs exactly one Start trigger (found ${triggers}).`
    )
  }

  const edgeIds = new Set<string>()
  const endpointPairs = new Set<string>()
  const validEdges: (typeof edges)[number][] = []
  for (const edge of edges) {
    if (
      !edge ||
      typeof edge.id !== "string" ||
      !edge.id ||
      typeof edge.source !== "string" ||
      !edge.source ||
      typeof edge.target !== "string" ||
      !edge.target
    ) {
      problems.push("Workflow contains a malformed connection.")
      continue
    }
    validEdges.push(edge)
    if (edgeIds.has(edge.id))
      problems.push(`Connection id "${edge.id}" is duplicated.`)
    edgeIds.add(edge.id)
    if (edge.sourceHandle != null || edge.targetHandle != null) {
      problems.push("Workflow connections reference unsupported node handles.")
    }
    if (edge.source === edge.target)
      problems.push("A node cannot connect to itself.")
    const pair = `${edge.source}\u0000${edge.target}`
    if (endpointPairs.has(pair))
      problems.push(
        "Duplicate connections between the same two nodes are not allowed."
      )
    endpointPairs.add(pair)
    if (nodeById.get(edge.target)?.data.type === "start") {
      problems.push("A connection cannot point into the Start trigger.")
    }
  }

  // Incomplete graphs may be saved as drafts, but cannot be run.
  if (runnable && validEdges.length === 0) {
    problems.push("Connect your nodes before running.")
  }

  if (validEdges.length > 0) {
    const unknownEndpoint = validEdges.find(
      (edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target)
    )
    if (unknownEndpoint) {
      problems.push(
        "A workflow connection points to a node that does not exist."
      )
    }
    try {
      // toposort throws on a cycle — the run would otherwise fail mid-sort.
      if (!unknownEndpoint)
        toposort(validEdges.map((e) => [e.source, e.target]))
    } catch {
      problems.push("Workflow has a cycle — remove the loop before running.")
    }

    const start = validNodes.find((node) => node.data?.type === "start")
    if (runnable && start && !unknownEndpoint) {
      const outgoing = new Map<string, string[]>()
      for (const edge of validEdges) {
        outgoing.set(edge.source, [
          ...(outgoing.get(edge.source) ?? []),
          edge.target,
        ])
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

      if (
        validNodes.some(
          (node) => node.id !== start.id && !reachable.has(node.id)
        )
      ) {
        problems.push(
          "Every node must be connected to and reachable from the Start trigger."
        )
      }
    }
  }

  if (runnable) {
    const outgoing = new Map<string, string[]>()
    for (const edge of validEdges) {
      outgoing.set(edge.source, [
        ...(outgoing.get(edge.source) ?? []),
        edge.target,
      ])
    }
    for (const node of validNodes) {
      for (const value of Object.values(node.data?.values ?? {})) {
        if (typeof value !== "string" || !value.includes("{{")) continue
        const matches = [...value.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)]
        const remainder = value.replace(/\{\{\s*[^{}]+?\s*\}\}/g, "")
        if (
          matches.length === 0 ||
          remainder.includes("{{") ||
          remainder.includes("}}")
        ) {
          problems.push(
            `Node "${node.id}" contains an invalid output reference.`
          )
          continue
        }
        for (const [, expression] of matches) {
          const dot = expression.indexOf(".")
          const sourceId = expression.slice(0, dot).trim()
          const outputPath = expression.slice(dot + 1).trim()
          const source = nodeById.get(sourceId)
          if (
            dot < 1 ||
            !source ||
            !nodeRegistry[source.data.type]?.outputs.some(
              (output) => output.path === outputPath
            )
          ) {
            problems.push(
              `Node "${node.id}" references an output that does not exist.`
            )
            continue
          }

          const reachable = new Set<string>()
          const pending = [...(outgoing.get(sourceId) ?? [])]
          while (pending.length > 0) {
            const target = pending.pop()!
            if (reachable.has(target)) continue
            reachable.add(target)
            pending.push(...(outgoing.get(target) ?? []))
          }
          if (!reachable.has(node.id)) {
            problems.push(
              `Node "${node.id}" references output from a node that does not precede it.`
            )
          }
        }
      }
    }
  }

  return problems
}

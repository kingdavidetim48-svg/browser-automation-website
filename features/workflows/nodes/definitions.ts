import { nodeRegistry } from "./node-registry"

export interface NodeDefinition {
  id: keyof typeof nodeRegistry
  name: string
  description: string
  category: "trigger" | "action"
  color: string
  icon: (typeof nodeRegistry)[keyof typeof nodeRegistry]["icon"]
}

// Keep the toolbar palette keyed to the same manifest used by persisted graphs
// and the executor map. This prevents aliases such as `open_url` from entering
// the graph when the runtime only recognizes `open-url`.
export const NODE_DEFINITIONS = Object.fromEntries(
  Object.entries(nodeRegistry).map(([id, definition]) => [
    id,
    {
      id,
      name: definition.label,
      description: definition.description,
      category: definition.kind,
      color: definition.accent,
      icon: definition.icon,
    },
  ]),
) as Record<keyof typeof nodeRegistry, NodeDefinition>

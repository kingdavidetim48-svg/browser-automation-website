export type NodeOutputs = Record<string, unknown>

const PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g

function getByPath(root: NodeOutputs, path: string): unknown {
  const keys = path.replace(/\[(\w+)\]/g, ".$1").split(".").filter(Boolean)

  return keys.reduce<unknown>((value, key) => {
    if (value === null || typeof value !== "object") return undefined
    return (value as Record<string, unknown>)[key]
  }, root)
}

export function interpolate({
  text,
  outputs,
}: {
  text: string
  outputs: NodeOutputs
}): string {
  return text.replace(PLACEHOLDER, (_match, expression: string) => {
    const value = getByPath(outputs, expression.trim())
    if (value == null) return ""
    return typeof value === "object" ? JSON.stringify(value) : String(value)
  })
}

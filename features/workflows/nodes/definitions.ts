import { Play, Globe, Sparkles, Table2, Eye, Bot, Mail, LucideIcon } from "lucide-react"

export interface NodeDefinition {
  id: string
  name: string
  description: string
  category: "trigger" | "action"
  color: string
  icon: LucideIcon
}

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  start: {
    id: "start",
    name: "Start",
    description: "Initial trigger starting the workflow execution",
    category: "trigger",
    color: "bg-blue-600",
    icon: Play,
  },
  open_url: {
    id: "open_url",
    name: "Open URL",
    description: "Navigate browser session to target URL",
    category: "action",
    color: "bg-emerald-600",
    icon: Globe,
  },
  act: {
    id: "act",
    name: "Act",
    description: "Perform browser action using natural language or selector",
    category: "action",
    color: "bg-purple-600",
    icon: Sparkles,
  },
  extract: {
    id: "extract",
    name: "Extract",
    description: "Extract structured data from the current page",
    category: "action",
    color: "bg-amber-600",
    icon: Table2,
  },
  observe: {
    id: "observe",
    name: "Observe",
    description: "Inspect elements and evaluate page state",
    category: "action",
    color: "bg-cyan-600",
    icon: Eye,
  },
  agent: {
    id: "agent",
    name: "Agent",
    description: "Autonomous browser sub-agent execution with Stagehand",
    category: "action",
    color: "bg-rose-600",
    icon: Bot,
  },
  send_email: {
    id: "send_email",
    name: "Send Email",
    description: "Dispatch notification email with execution results",
    category: "action",
    color: "bg-orange-600",
    icon: Mail,
  },
}

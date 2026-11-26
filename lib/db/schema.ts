import type { Edge, Viewport } from "@xyflow/react"
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core"

import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

// Canonical React Flow graph persisted in workflows.graph JSONB. Node and edge
// IDs, configurations, positions, and the viewport stay scoped to this row.
export type WorkflowGraph = {
  nodes: StepNodeType[]
  edges: Edge[]
  viewport?: Viewport
}

export const workflows = pgTable("workflows", {
  id: varchar("id", { length: 256 }).primaryKey(),
  orgId: varchar("organization_id", { length: 256 }).notNull(),
  name: varchar("name", { length: 256 }).notNull(),
  graph: jsonb("graph").$type<WorkflowGraph>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Workflow = typeof workflows.$inferSelect

export type ExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"

export type NodeExecutionStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "skipped"

export type TriggerInfo = {
  type: "manual" | "api" | "schedule"
  triggeredByUserId?: string
}

export const workflowExecutions = pgTable(
  "workflow_executions",
  {
    id: varchar("id", { length: 256 }).primaryKey(),
    workflowId: varchar("workflow_id", { length: 256 })
      .notNull()
      .references(() => workflows.id, { onDelete: "cascade" }),
    orgId: varchar("organization_id", { length: 256 }).notNull(),
    status: varchar("status", { length: 32 }).$type<ExecutionStatus>().notNull(),
    triggerRunId: varchar("trigger_run_id", { length: 256 }),
    triggerInfo: jsonb("trigger_info").$type<TriggerInfo>().notNull(),
    browserbaseSessionId: varchar("browserbase_session_id", { length: 256 }),
    error: text("error"),
    totalNodes: integer("total_nodes").notNull().default(0),
    completedNodes: integer("completed_nodes").notNull().default(0),
    failedNodes: integer("failed_nodes").notNull().default(0),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workflow_executions_workflow_created_idx").on(
      table.workflowId,
      table.createdAt
    ),
    index("workflow_executions_org_workflow_idx").on(
      table.orgId,
      table.workflowId
    ),
    index("workflow_executions_trigger_run_idx").on(table.triggerRunId),
  ]
)

export type WorkflowExecution = typeof workflowExecutions.$inferSelect

export const executionNodeRuns = pgTable(
  "execution_node_runs",
  {
    id: varchar("id", { length: 256 }).primaryKey(),
    executionId: varchar("execution_id", { length: 256 })
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    nodeId: varchar("node_id", { length: 256 }).notNull(),
    nodeType: varchar("node_type", { length: 64 }).notNull(),
    nodeTitle: varchar("node_title", { length: 256 }).notNull(),
    status: varchar("status", { length: 32 })
      .$type<NodeExecutionStatus>()
      .notNull(),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<unknown>(),
    error: text("error"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),
  },
  (table) => [
    index("execution_node_runs_execution_node_idx").on(
      table.executionId,
      table.nodeId
    ),
  ]
)

export type ExecutionNodeRun = typeof executionNodeRuns.$inferSelect

export type ExecutionLogLevel = "info" | "warn" | "error"

export const executionLogs = pgTable(
  "execution_logs",
  {
    id: varchar("id", { length: 256 }).primaryKey(),
    executionId: varchar("execution_id", { length: 256 })
      .notNull()
      .references(() => workflowExecutions.id, { onDelete: "cascade" }),
    nodeId: varchar("node_id", { length: 256 }),
    nodeTitle: varchar("node_title", { length: 256 }),
    level: varchar("level", { length: 16 })
      .$type<ExecutionLogLevel>()
      .notNull(),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    message: text("message").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("execution_logs_execution_created_idx").on(
      table.executionId,
      table.createdAt
    ),
  ]
)

export type ExecutionLog = typeof executionLogs.$inferSelect

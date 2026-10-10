import type { Edge, Viewport } from "@xyflow/react"
import { jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core"

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

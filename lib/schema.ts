// Database schema for the browser-automation project
// Uses Neon Postgres via Drizzle ORM

import { pgTable, pgEnum, varchar, text, timestamp, json } from "drizzle-orm/pg-core";

// Enum for workflow status
export const workflowStatus = pgEnum("status", ["draft", "active", "archived"]);

// Enum for node type
export const nodeType = pgEnum("type", ["start", "process", "decision", "end"]);

// Enum for trigger type
export const triggerType = pgEnum("type", ["webhook", "schedule", "manual"]);

// Workflows table - stores the workflow definitions
export const workflows = pgTable("workflows", {
  id: varchar("id", { length: 256 }).primaryKey(),
  name: varchar("name", { length: 256 }).notNull(),
  description: text("description"),
  status: workflowStatus("status").default("draft").notNull(),
  triggerType: triggerType("trigger_type"),
  triggerConfig: json("trigger_config"),
  nodes: json("nodes").$default(() => []),
  edges: json("edges").$default(() => []),
  // Clerk identity columns
  userId: varchar("user_id", { length: 256 }),
  organizationId: varchar("organization_id", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Nodes table - individual nodes within a workflow
export const nodes = pgTable("nodes", {
  id: varchar("id", { length: 256 }).primaryKey(),
  workflowId: varchar("workflow_id", { length: 256 }).references(() => workflows.id),
  type: nodeType("type").notNull(),
  position: json("position"),
  data: json("data"),
  label: varchar("label", { length: 256 }),
  config: json("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Edges table - connections between nodes
export const edges = pgTable("edges", {
  id: varchar("id", { length: 256 }).primaryKey(),
  workflowId: varchar("workflow_id", { length: 256 }).references(() => workflows.id),
  sourceNodeId: varchar("source_node_id", { length: 256 }).notNull(),
  targetNodeId: varchar("target_node_id", { length: 256 }).notNull(),
  label: varchar("label", { length: 256 }),
  config: json("config"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Users table - extended user info for Better Auth integration
export const users = pgTable("users", {
  id: varchar("id", { length: 256 }).primaryKey(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }).unique(),
  emailVerified: timestamp("email_verified"),
  image: varchar("image", { length: 256 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Sessions table - for Better Auth session management
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: varchar("user_id", { length: 256 }).notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Verification table - for Better Auth email verification
export const verifications = pgTable("verifications", {
  id: varchar("id", { length: 256 }).primaryKey(),
  identifier: varchar("identifier", { length: 256 }).notNull(),
  value: varchar("value", { length: 256 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit log table - for tracking changes
// userId references Clerk user ID (e.g., user_xxxxxx) — no FK enforced since Clerk manages users externally
export const auditLog = pgTable("audit_log", {
  id: varchar("id", { length: 256 }).primaryKey(),
  userId: varchar("user_id", { length: 256 }),  // Clerk userId
  action: varchar("action", { length: 256 }).notNull(),
  entityType: varchar("entity_type", { length: 256 }).notNull(),
  entityId: varchar("entity_id", { length: 256 }),
  changes: json("changes"),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
export type Edge = typeof edges.$inferSelect;
export type NewEdge = typeof edges.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Verification = typeof verifications.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
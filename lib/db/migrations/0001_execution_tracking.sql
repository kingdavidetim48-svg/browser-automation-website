CREATE TABLE "execution_logs" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"execution_id" varchar(256) NOT NULL,
	"node_id" varchar(256),
	"node_title" varchar(256),
	"level" varchar(16) NOT NULL,
	"event_type" varchar(64) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_node_runs" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"execution_id" varchar(256) NOT NULL,
	"node_id" varchar(256) NOT NULL,
	"node_type" varchar(64) NOT NULL,
	"node_title" varchar(256) NOT NULL,
	"status" varchar(32) NOT NULL,
	"input" jsonb,
	"output" jsonb,
	"error" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "workflow_executions" (
	"id" varchar(256) PRIMARY KEY NOT NULL,
	"workflow_id" varchar(256) NOT NULL,
	"organization_id" varchar(256) NOT NULL,
	"status" varchar(32) NOT NULL,
	"trigger_run_id" varchar(256),
	"trigger_info" jsonb NOT NULL,
	"browserbase_session_id" varchar(256),
	"error" text,
	"total_nodes" integer DEFAULT 0 NOT NULL,
	"completed_nodes" integer DEFAULT 0 NOT NULL,
	"failed_nodes" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_node_runs" ADD CONSTRAINT "execution_node_runs_execution_id_workflow_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."workflow_executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "execution_logs_execution_created_idx" ON "execution_logs" USING btree ("execution_id","created_at");--> statement-breakpoint
CREATE INDEX "execution_node_runs_execution_node_idx" ON "execution_node_runs" USING btree ("execution_id","node_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_workflow_created_idx" ON "workflow_executions" USING btree ("workflow_id","created_at");--> statement-breakpoint
CREATE INDEX "workflow_executions_org_workflow_idx" ON "workflow_executions" USING btree ("organization_id","workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_executions_trigger_run_idx" ON "workflow_executions" USING btree ("trigger_run_id");
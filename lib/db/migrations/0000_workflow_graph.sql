ALTER TABLE "workflows" ADD COLUMN "graph" jsonb;
--> statement-breakpoint
UPDATE "workflows"
SET "graph" = jsonb_build_object(
  'nodes', CASE WHEN jsonb_typeof("nodes"::jsonb) = 'array' THEN "nodes"::jsonb ELSE '[]'::jsonb END,
  'edges', CASE WHEN jsonb_typeof("edges"::jsonb) = 'array' THEN "edges"::jsonb ELSE '[]'::jsonb END
);
--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "graph" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "workflows" ALTER COLUMN "organization_id" SET NOT NULL;

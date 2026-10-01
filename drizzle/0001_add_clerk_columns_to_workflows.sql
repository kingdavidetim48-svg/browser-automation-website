ALTER TABLE "audit_log" DROP CONSTRAINT "audit_log_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "user_id" varchar(256);--> statement-breakpoint
ALTER TABLE "workflows" ADD COLUMN "organization_id" varchar(256);
CREATE TABLE "billing_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text,
	"feature" text NOT NULL,
	"provider" text NOT NULL,
	"raw_cost_micros" integer NOT NULL,
	"charged_credits" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_usage" ADD CONSTRAINT "billing_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_usage_org_created_idx" ON "billing_usage" USING btree ("organization_id","created_at");
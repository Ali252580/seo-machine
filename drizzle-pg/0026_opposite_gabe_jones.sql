CREATE TABLE "billing_payments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"provider" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"amount_credits" integer NOT NULL,
	"amount_irt" integer,
	"amount_usdt_micros" integer,
	"provider_ref" text,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_customer_status" ADD COLUMN "credit_balance" integer DEFAULT 1000 NOT NULL;--> statement-breakpoint
ALTER TABLE "billing_payments" ADD CONSTRAINT "billing_payments_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_payments_organization_created_idx" ON "billing_payments" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_payments_provider_ref_idx" ON "billing_payments" USING btree ("provider","provider_ref");
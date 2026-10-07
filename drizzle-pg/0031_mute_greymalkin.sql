CREATE TABLE "wordpress_connections" (
	"project_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"site_url" text NOT NULL,
	"username" text NOT NULL,
	"encrypted_password" text NOT NULL,
	"connected_by_user_id" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL,
	"updated_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wordpress_connections" ADD CONSTRAINT "wordpress_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wordpress_connections" ADD CONSTRAINT "wordpress_connections_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
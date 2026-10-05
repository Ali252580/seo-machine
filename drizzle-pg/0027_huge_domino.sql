CREATE TABLE "sam_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" text DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sam_messages" ADD CONSTRAINT "sam_messages_session_id_sam_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sam_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sam_messages_session_created_idx" ON "sam_messages" USING btree ("session_id","created_at");
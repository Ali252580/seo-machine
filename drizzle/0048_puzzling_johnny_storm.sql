CREATE TABLE `billing_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`amount_credits` integer NOT NULL,
	`amount_irt` integer,
	`amount_usdt_micros` integer,
	`provider_ref` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `billing_payments_organization_created_idx` ON `billing_payments` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `billing_payments_provider_ref_idx` ON `billing_payments` (`provider`,`provider_ref`);--> statement-breakpoint
ALTER TABLE `billing_customer_status` ADD `credit_balance` integer DEFAULT 1000 NOT NULL;
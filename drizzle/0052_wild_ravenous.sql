CREATE TABLE `wordpress_connections` (
	`project_id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`site_url` text NOT NULL,
	`username` text NOT NULL,
	`encrypted_password` text NOT NULL,
	`connected_by_user_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);

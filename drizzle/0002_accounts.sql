CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`store_name` text DEFAULT 'My store' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created` text NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `sessions` (`account_id`);

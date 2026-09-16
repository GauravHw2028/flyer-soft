CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`templates` text DEFAULT '[]' NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `businesses_email_unique` ON `businesses` (`email`);--> statement-breakpoint
CREATE TABLE `credit_accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`delta` integer NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_ledger_owner` ON `credit_ledger` (`owner`);--> statement-breakpoint
CREATE TABLE `enhancements` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`request` text,
	`result` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `topups` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`credits` integer NOT NULL,
	`reference` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	`reviewer` text
);

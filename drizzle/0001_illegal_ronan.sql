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
--> statement-breakpoint
CREATE TRIGGER credit_ledger_guard BEFORE INSERT ON credit_ledger BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM credit_accounts WHERE owner=NEW.owner AND balance+NEW.delta>=0) THEN RAISE(ABORT,'Insufficient credits') END;
END;
--> statement-breakpoint
CREATE TRIGGER credit_ledger_apply AFTER INSERT ON credit_ledger BEGIN
 UPDATE credit_accounts SET balance=balance+NEW.delta WHERE owner=NEW.owner;
END;

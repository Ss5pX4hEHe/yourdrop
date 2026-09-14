CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL,
	`last_seen` integer NOT NULL
);

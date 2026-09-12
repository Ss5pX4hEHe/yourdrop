CREATE TABLE `device_links` (
	`code` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_links` (
	`public_id` text PRIMARY KEY NOT NULL,
	`profile_id` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `public_links_profile_id_unique` ON `public_links` (`profile_id`);
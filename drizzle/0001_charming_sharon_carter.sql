CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`createdBy` text NOT NULL,
	`message` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`projectTitle` text NOT NULL,
	`semester` text NOT NULL,
	`projectCategory` text NOT NULL,
	`status` text NOT NULL,
	`description` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);

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

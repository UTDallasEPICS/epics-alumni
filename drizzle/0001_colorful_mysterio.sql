CREATE TABLE `announcements` (
	`id` text PRIMARY KEY NOT NULL,
	`createdBy` text NOT NULL,
	`message` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

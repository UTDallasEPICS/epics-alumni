CREATE TABLE `comment` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`postId` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comment_postId_idx` ON `comment` (`postId`);--> statement-breakpoint
CREATE TABLE `like` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`postId` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`postId`) REFERENCES `post`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `like_userId_postId_idx` ON `like` (`userId`,`postId`);--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`senderId` text NOT NULL,
	`receiverId` text NOT NULL,
	`content` text NOT NULL,
	`isRead` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`senderId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiverId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `message_senderId_idx` ON `message` (`senderId`);--> statement-breakpoint
CREATE INDEX `message_receiverId_idx` ON `message` (`receiverId`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`message` text NOT NULL,
	`referenceId` text,
	`isRead` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notification_userId_idx` ON `notification` (`userId`);--> statement-breakpoint
CREATE TABLE `post` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `post_userId_idx` ON `post` (`userId`);--> statement-breakpoint
CREATE TABLE `profile` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`profileType` text NOT NULL,
	`gradYear` integer,
	`major` text,
	`currentCompany` text,
	`jobTitle` text,
	`city` text,
	`linkedinUrl` text,
	`githubUrl` text,
	`discordUsername` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_userId_unique` ON `profile` (`userId`);--> statement-breakpoint
CREATE INDEX `profile_userId_idx` ON `profile` (`userId`);--> statement-breakpoint
CREATE INDEX `profile_company_idx` ON `profile` (`currentCompany`);--> statement-breakpoint
CREATE INDEX `profile_gradYear_idx` ON `profile` (`gradYear`);--> statement-breakpoint
CREATE INDEX `profile_type_idx` ON `profile` (`profileType`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`githubUrl` text,
	`description` text,
	`semester` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `userProject` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`projectId` text NOT NULL,
	`role` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `userProject_userId_idx` ON `userProject` (`userId`);--> statement-breakpoint
CREATE INDEX `userProject_projectId_idx` ON `userProject` (`projectId`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_account`("id", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "id_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "password", "created_at", "updated_at") SELECT "id", "account_id", "provider_id", "user_id", "access_token", "refresh_token", "id_token", "access_token_expires_at", "refresh_token_expires_at", "scope", "password", "created_at", "updated_at" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE TABLE `__new_session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_session`("id", "expires_at", "token", "created_at", "updated_at", "ip_address", "user_agent", "user_id") SELECT "id", "expires_at", "token", "created_at", "updated_at", "ip_address", "user_agent", "user_id" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `email_verified` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `emailVerified`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `verification` ADD `expires_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `verification` ADD `created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `verification` ADD `updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL;--> statement-breakpoint
ALTER TABLE `verification` DROP COLUMN `expiresAt`;--> statement-breakpoint
ALTER TABLE `verification` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `verification` DROP COLUMN `updatedAt`;
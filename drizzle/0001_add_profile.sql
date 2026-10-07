CREATE TABLE `profile` (
	`userId` text PRIMARY KEY NOT NULL,
	`major` text,
	`graduationYear` integer,
	`company` text,
	`jobTitle` text,
	`bio` text,
	`linkedinUrl` text,
	`githubUrl` text,
	`websiteUrl` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

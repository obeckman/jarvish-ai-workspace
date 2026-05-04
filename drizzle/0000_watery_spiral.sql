CREATE TABLE `checkpoints` (
	`thread_id` text NOT NULL,
	`checkpoint_ns` text DEFAULT '' NOT NULL,
	`checkpoint_id` text NOT NULL,
	`parent_checkpoint_id` text,
	`type` text,
	`checkpoint` text,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `session_summaries` (
	`session_id` text PRIMARY KEY NOT NULL,
	`summary_title` text NOT NULL,
	`user_message` text NOT NULL,
	`ai_answer` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `structured_facts` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`user_id` text,
	`fact` text NOT NULL,
	`category` text DEFAULT 'general',
	`confidence` integer DEFAULT 100,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `writes` (
	`thread_id` text NOT NULL,
	`checkpoint_ns` text DEFAULT '' NOT NULL,
	`checkpoint_id` text NOT NULL,
	`task_id` text NOT NULL,
	`idx` integer NOT NULL,
	`channel` text NOT NULL,
	`type` text,
	`value` text
);

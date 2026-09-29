CREATE TABLE `events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session` text NOT NULL,
	`order_id` text NOT NULL,
	`message` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`session` text NOT NULL,
	`order_id` text NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'imported' NOT NULL,
	`result` text,
	`receipt` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_orders_session_order_id` ON `orders` (`session`,`order_id`);
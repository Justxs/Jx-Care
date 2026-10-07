CREATE TABLE `avoid_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`ref_id` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `condition_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`area` text NOT NULL,
	`states` text DEFAULT '[]' NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `condition_log_day_area_uq` ON `condition_log` (`day`,`area`);--> statement-breakpoint
CREATE INDEX `condition_log_day_idx` ON `condition_log` (`day`);--> statement-breakpoint
CREATE TABLE `conflict` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`left_kind` text NOT NULL,
	`left_id` integer NOT NULL,
	`right_kind` text NOT NULL,
	`right_id` integer NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hair_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hair_task_id` integer NOT NULL,
	`day` text NOT NULL,
	`due_day` text,
	`product_ids` text DEFAULT '[]' NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`hair_task_id`) REFERENCES `hair_task`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `hair_log_task_day_idx` ON `hair_log` (`hair_task_id`,`day`);--> statement-breakpoint
CREATE TABLE `hair_task` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`other_kind` text,
	`product_ids` text DEFAULT '[]' NOT NULL,
	`schedule_kind` text DEFAULT 'interval' NOT NULL,
	`every_n_days` integer,
	`interval_unit` text DEFAULT 'days' NOT NULL,
	`days_of_week` text,
	`last_done_at` text,
	`reminder_time` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingredient` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`group_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `ingredient_group`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ingredient_normalized_name_unique` ON `ingredient` (`normalized_name`);--> statement-breakpoint
CREATE TABLE `ingredient_group` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`area` text NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`photo_uri` text,
	`size` real,
	`unit` text,
	`price_cents` integer,
	`purchased_at` text,
	`expires_at` text,
	`opened_at` text,
	`pao_months` integer,
	`notes` text,
	`rating` integer,
	`would_rebuy` integer,
	`archived_at` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_archived_at_idx` ON `product` (`archived_at`);--> statement-breakpoint
CREATE TABLE `product_ingredient` (
	`product_id` integer NOT NULL,
	`ingredient_id` integer NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`product_id`, `ingredient_id`),
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`ingredient_id`) REFERENCES `ingredient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_ingredient_ingredient_idx` ON `product_ingredient` (`ingredient_id`);--> statement-breakpoint
CREATE TABLE `product_note` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`day` text NOT NULL,
	`text` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `product_note_product_idx` ON `product_note` (`product_id`);--> statement-breakpoint
CREATE TABLE `progress_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`week_start` text NOT NULL,
	`taken_at` integer,
	`skipped` integer DEFAULT false NOT NULL,
	`rating` integer,
	`tags` text DEFAULT '[]' NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `progress_entry_area_week_uq` ON `progress_entry` (`area`,`week_start`);--> statement-breakpoint
CREATE TABLE `progress_photo` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`angle` text NOT NULL,
	`file_uri` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `progress_entry`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `routine` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`time_of_day` text NOT NULL,
	`custom_name` text,
	`sort_time` text DEFAULT '07:00' NOT NULL,
	`days_of_week` text DEFAULT '[1,2,3,4,5,6,7]' NOT NULL,
	`reminder_time` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `routine_choice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`time_of_day_key` text NOT NULL,
	`weekday` integer NOT NULL,
	`routine_id` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_choice_key_weekday_uq` ON `routine_choice` (`time_of_day_key`,`weekday`);--> statement-breakpoint
CREATE TABLE `routine_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`day` text NOT NULL,
	`due_step_ids` text DEFAULT '[]' NOT NULL,
	`done_step_ids` text DEFAULT '[]' NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `routine_log_routine_day_uq` ON `routine_log` (`routine_id`,`day`);--> statement-breakpoint
CREATE INDEX `routine_log_day_idx` ON `routine_log` (`day`);--> statement-breakpoint
CREATE TABLE `routine_step` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`routine_id` integer NOT NULL,
	`product_id` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`note` text,
	`schedule_kind` text DEFAULT 'always' NOT NULL,
	`days_of_week` text,
	`every_n_days` integer,
	`start_date` text,
	`wait_seconds` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`routine_id`) REFERENCES `routine`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `scheduled_notification` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer,
	`kind` text NOT NULL,
	`notification_id` text NOT NULL,
	`fire_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`language` text DEFAULT 'en' NOT NULL,
	`currency` text DEFAULT 'EUR' NOT NULL,
	`expiry_warn_days` integer DEFAULT 30 NOT NULL,
	`expiry_reminder_time` text DEFAULT '09:00' NOT NULL,
	`expiry_reminders_on` integer DEFAULT false NOT NULL,
	`expiry_day_reminder_on` integer DEFAULT true NOT NULL,
	`routine_reminders_on` integer DEFAULT true NOT NULL,
	`hair_reminders_on` integer DEFAULT true NOT NULL,
	`weekly_photo_on` integer DEFAULT false NOT NULL,
	`weekly_photo_weekday` integer DEFAULT 7 NOT NULL,
	`weekly_photo_time` text DEFAULT '10:00' NOT NULL,
	`weekly_digest_on` integer DEFAULT true NOT NULL,
	`snooze_minutes` integer DEFAULT 15 NOT NULL,
	`auto_lock_seconds` integer DEFAULT 60 NOT NULL,
	`biometrics_on` integer DEFAULT false NOT NULL,
	`skin_angles` text DEFAULT '["front"]' NOT NULL,
	`hair_album_on` integer DEFAULT false NOT NULL,
	`hair_angles` text DEFAULT '["front","back","top"]' NOT NULL,
	`photo_guide_on` integer DEFAULT true NOT NULL,
	`photo_guide_opacity` real DEFAULT 0.3 NOT NULL,
	`reminder_ask_done` integer DEFAULT false NOT NULL,
	`setup_done_at` text,
	`setup_hidden_at` text,
	`last_backup_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `shopping_dismissal` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`dismissed_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `shopping_dismissal_product_id_unique` ON `shopping_dismissal` (`product_id`);--> statement-breakpoint
CREATE TABLE `shopping_item` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer,
	`name` text NOT NULL,
	`brand` text,
	`area` text,
	`note` text,
	`list` text DEFAULT 'to_buy' NOT NULL,
	`bought_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `shopping_item_bought_at_idx` ON `shopping_item` (`bought_at`);
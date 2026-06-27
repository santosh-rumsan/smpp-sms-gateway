CREATE TABLE `webhook_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`channel_id` text NOT NULL,
	`webhook_id` text,
	`url` text NOT NULL,
	`event` text NOT NULL,
	`status` text NOT NULL,
	`status_code` integer,
	`error` text,
	`triggered_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE `connection_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`device_id` text,
	`device_name` text,
	`type` text NOT NULL,
	`occurred_at` integer DEFAULT (unixepoch()) NOT NULL
);
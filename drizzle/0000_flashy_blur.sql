CREATE TABLE `answer_records` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_session_id` text NOT NULL,
	`quiz_session_question_id` text NOT NULL,
	`user_id` text NOT NULL,
	`question_url` text NOT NULL,
	`selected_answer` text NOT NULL,
	`correct_answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`answered_at` text,
	FOREIGN KEY (`quiz_session_id`) REFERENCES `quiz_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quiz_session_question_id`) REFERENCES `quiz_session_questions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `answer_records_session_question_unique` ON `answer_records` (`quiz_session_question_id`);--> statement-breakpoint
CREATE TABLE `quiz_session_questions` (
	`id` text PRIMARY KEY NOT NULL,
	`quiz_session_id` text NOT NULL,
	`question_url` text NOT NULL,
	`question_index` integer NOT NULL,
	`source_type` text NOT NULL,
	`source_topic` text,
	`source_category` text,
	`selection_reason` text,
	FOREIGN KEY (`quiz_session_id`) REFERENCES `quiz_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_session_questions_session_index_unique` ON `quiz_session_questions` (`quiz_session_id`,`question_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_session_questions_session_url_unique` ON `quiz_session_questions` (`quiz_session_id`,`question_url`);--> statement-breakpoint
CREATE TABLE `quiz_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`raw_scope_input` text NOT NULL,
	`matched_scope_json` text,
	`selection_summary_json` text,
	`status` text NOT NULL,
	`total_questions` integer NOT NULL,
	`correct_count` integer,
	`incorrect_count` integer,
	`created_at` text,
	`submitted_at` text,
	`expires_at` text,
	`purge_after_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "quiz_sessions_total_questions_20_check" CHECK("quiz_sessions"."total_questions" = 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quiz_sessions_token_unique` ON `quiz_sessions` (`token`);--> statement-breakpoint
CREATE TABLE `scope_parse_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`raw_input` text,
	`method` text,
	`matched_scope_json` text,
	`suggestions_json` text,
	`status` text,
	`error_message` text,
	`created_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_question_stats` (
	`user_id` text NOT NULL,
	`question_url` text NOT NULL,
	`attempt_count` integer NOT NULL,
	`correct_count` integer NOT NULL,
	`incorrect_count` integer NOT NULL,
	`last_answered_at` text,
	`last_is_correct` integer,
	`active_wrong` integer NOT NULL,
	`consecutive_correct_after_wrong` integer NOT NULL,
	PRIMARY KEY(`user_id`, `question_url`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user_topic_stats` (
	`user_id` text NOT NULL,
	`topic_key` text NOT NULL,
	`topic_type` text NOT NULL,
	`attempt_count` integer NOT NULL,
	`correct_count` integer NOT NULL,
	`incorrect_count` integer NOT NULL,
	`accuracy` real NOT NULL,
	`last_answered_at` text,
	PRIMARY KEY(`user_id`, `topic_key`, `topic_type`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`telegram_user_id` text NOT NULL,
	`telegram_username` text,
	`telegram_first_name` text,
	`telegram_last_name` text,
	`created_at` text,
	`last_seen_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_telegram_user_id_unique` ON `users` (`telegram_user_id`);
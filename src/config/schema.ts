import { z } from "zod";

const positiveIntegerSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().min(1);

export const appConfigSchema = z
  .object({
    quiz: z.strictObject({
      total_questions: positiveIntegerSchema,
      requested_scope_questions: positiveIntegerSchema,
      reinforcement_questions: positiveIntegerSchema,
      recent_question_avoid_days: positiveIntegerSchema,
      unsubmitted_token_ttl_days: positiveIntegerSchema,
      unsubmitted_session_purge_days: positiveIntegerSchema,
      weak_topic: z.strictObject({
        accuracy_threshold: z.number().min(0).max(1),
        min_answered: positiveIntegerSchema,
      }),
      wrong_question: z.strictObject({
        remove_after_consecutive_correct: positiveIntegerSchema,
      }),
      rate_limit: z.strictObject({
        get_quiz_per_ip_per_minute: positiveIntegerSchema,
        submit_per_ip_per_minute: positiveIntegerSchema,
        submit_per_token_per_minute: positiveIntegerSchema,
      }),
    }),
    topics: z.strictObject({
      high_weight_topics: z.array(nonEmptyStringSchema),
      aliases: z.record(nonEmptyStringSchema, z.array(nonEmptyStringSchema)),
      standard_topic_mappings: z.record(
        nonEmptyStringSchema,
        nonEmptyStringSchema
      ),
    }),
    ai: z.strictObject({
      provider: nonEmptyStringSchema,
      model: nonEmptyStringSchema,
      temperature: z.number(),
      max_suggestions: positiveIntegerSchema,
    }),
    telegram: z.strictObject({
      webhook_path_prefix: nonEmptyStringSchema,
      path_secret_env: nonEmptyStringSchema,
      header_secret_env: nonEmptyStringSchema,
      bot_token_env: nonEmptyStringSchema,
    }),
    deployment: z.strictObject({
      public_base_url_env: nonEmptyStringSchema,
      edge_host_env: nonEmptyStringSchema,
      edge_port_env: nonEmptyStringSchema,
      data_dir: nonEmptyStringSchema,
      config_dir: nonEmptyStringSchema,
      assets_dir: nonEmptyStringSchema,
      backups_dir: nonEmptyStringSchema,
    }),
  })
  .strict();

export type AppConfig = z.infer<typeof appConfigSchema>;

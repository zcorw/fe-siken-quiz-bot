import { z } from "zod";

const positiveIntegerSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().min(1);

const topicsConfigSchema = z
  .strictObject({
    standard_topics: z.array(nonEmptyStringSchema).min(1),
    high_weight_topics: z.array(nonEmptyStringSchema).min(1),
    aliases: z.record(nonEmptyStringSchema, z.array(nonEmptyStringSchema)),
    standard_topic_mappings: z.record(
      nonEmptyStringSchema,
      nonEmptyStringSchema
    ),
  })
  .superRefine((topics, ctx) => {
    const standardTopics = new Set(topics.standard_topics);

    for (const [index, topic] of topics.high_weight_topics.entries()) {
      if (!standardTopics.has(topic)) {
        ctx.addIssue({
          code: "custom",
          message: "high_weight_topics must be standard topics",
          path: ["high_weight_topics", index],
        });
      }
    }

    for (const topic of Object.keys(topics.aliases)) {
      if (!standardTopics.has(topic)) {
        ctx.addIssue({
          code: "custom",
          message: "aliases keys must be standard topics",
          path: ["aliases", topic],
        });
      }
    }

    for (const [sourceTopic, standardTopic] of Object.entries(
      topics.standard_topic_mappings
    )) {
      if (!standardTopics.has(standardTopic)) {
        ctx.addIssue({
          code: "custom",
          message: "standard_topic_mappings values must be standard topics",
          path: ["standard_topic_mappings", sourceTopic],
        });
      }
    }
  });

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
    topics: topicsConfigSchema,
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

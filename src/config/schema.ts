import { z } from "zod";

const positiveIntegerSchema = z.number().int().positive();
const nonEmptyStringSchema = z.string().min(1);

const topicsConfigSchema = z
  .strictObject({
    category_tree: z.record(
      nonEmptyStringSchema,
      z.array(nonEmptyStringSchema).min(1)
    ),
    high_weight_topics: z.array(nonEmptyStringSchema).min(1),
    aliases: z.record(nonEmptyStringSchema, z.array(nonEmptyStringSchema)),
  })
  .superRefine((topics, ctx) => {
    const majorCategories = new Set(Object.keys(topics.category_tree));

    for (const [index, topic] of topics.high_weight_topics.entries()) {
      if (!majorCategories.has(topic)) {
        ctx.addIssue({
          code: "custom",
          message: "high_weight_topics must be category_tree top-level keys",
          path: ["high_weight_topics", index],
        });
      }
    }

    for (const topic of Object.keys(topics.aliases)) {
      if (!majorCategories.has(topic)) {
        ctx.addIssue({
          code: "custom",
          message: "aliases keys must be category_tree top-level keys",
          path: ["aliases", topic],
        });
      }
    }

    const minorToMajor = new Map<string, string>();
    for (const [majorCategory, minorCategories] of Object.entries(
      topics.category_tree
    )) {
      for (const [index, minorCategory] of minorCategories.entries()) {
        const previousMajorCategory = minorToMajor.get(minorCategory);
        if (previousMajorCategory !== undefined) {
          ctx.addIssue({
            code: "custom",
            message: "minor categories cannot be duplicated",
            path: ["category_tree", majorCategory, index],
          });
          continue;
        }

        minorToMajor.set(minorCategory, majorCategory);
      }
    }
  });

export type TopicsConfig = z.infer<typeof topicsConfigSchema>;

export function getMajorCategories(topics: TopicsConfig): string[] {
  return Object.keys(topics.category_tree);
}

export function getMinorToMajorCategoryMap(
  topics: TopicsConfig
): Map<string, string> {
  const minorToMajor = new Map<string, string>();

  for (const [majorCategory, minorCategories] of Object.entries(
    topics.category_tree
  )) {
    for (const minorCategory of minorCategories) {
      minorToMajor.set(minorCategory, majorCategory);
    }
  }

  return minorToMajor;
}

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

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAppConfig } from "./app-config";

describe("loadAppConfig", () => {
  it("loads and validates the sample app config", async () => {
    const config = await loadAppConfig(
      path.join(process.cwd(), "config", "app.yaml")
    );

    expect(config.quiz.total_questions).toBe(20);
    expect(config.quiz.weak_topic.accuracy_threshold).toBe(0.6);
    expect(config.topics.standard_topics).toContain("データベース");
    expect(config.topics.standard_topics.length).toBeGreaterThanOrEqual(20);
    expect(config.topics.high_weight_topics).toContain("情報セキュリティ");
    expect(config.topics.standard_topic_mappings["データ操作"]).toBe(
      "データベース"
    );
    expect(config.topics.standard_topic_mappings["通信プロトコル"]).toBe(
      "ネットワーク"
    );
    expect(config.topics.standard_topic_mappings["データ通信と制御"]).toBe(
      "ネットワーク"
    );
    expect(config.ai).toMatchObject({
      provider: "openai",
      model: "gpt-4.1-mini",
      temperature: 0,
      max_suggestions: 3,
    });
    expect(config.deployment.data_dir).toBe("/opt/fe-quiz-bot/data");
  });

  it("rejects configs that are missing required fields", async () => {
    const configDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-config-"));
    const invalidConfigPath = path.join(configDir, "app.yaml");
    await writeFile(
      invalidConfigPath,
      `
quiz:
  total_questions: 20
topics:
  high_weight_topics: []
  aliases: {}
  standard_topic_mappings: {}
ai:
  provider: openai
  temperature: 0
  max_suggestions: 3
telegram:
  webhook_path_prefix: /telegram/webhook
  path_secret_env: TELEGRAM_WEBHOOK_PATH_SECRET
  header_secret_env: TELEGRAM_WEBHOOK_SECRET_TOKEN
  bot_token_env: TELEGRAM_BOT_TOKEN
deployment:
  public_base_url_env: PUBLIC_BASE_URL
  edge_host_env: EDGE_HOST
  edge_port_env: EDGE_PORT
  data_dir: /opt/fe-quiz-bot/data
  config_dir: /opt/fe-quiz-bot/config
  assets_dir: /opt/fe-quiz-bot/assets
  backups_dir: /opt/fe-quiz-bot/backups
`,
      "utf8"
    );

    await expect(loadAppConfig(invalidConfigPath)).rejects.toThrow(
      /Invalid app config[\s\S]*quiz\.weak_topic[\s\S]*ai\.model/
    );
  });

  it("rejects configs with invalid required field values", async () => {
    const configDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-config-"));
    const invalidConfigPath = path.join(configDir, "app.yaml");
    await writeFile(
      invalidConfigPath,
      `
quiz:
  total_questions: 0
  requested_scope_questions: 15
  reinforcement_questions: 5
  recent_question_avoid_days: 7
  unsubmitted_token_ttl_days: 7
  unsubmitted_session_purge_days: 30
  weak_topic:
    accuracy_threshold: 1.5
    min_answered: 3
  wrong_question:
    remove_after_consecutive_correct: 2
  rate_limit:
    get_quiz_per_ip_per_minute: 60
    submit_per_ip_per_minute: 10
    submit_per_token_per_minute: 3
topics:
  high_weight_topics: []
  aliases: {}
  standard_topic_mappings: {}
ai:
  provider: openai
  model: ""
  temperature: 0
  max_suggestions: 3
telegram:
  webhook_path_prefix: /telegram/webhook
  path_secret_env: TELEGRAM_WEBHOOK_PATH_SECRET
  header_secret_env: TELEGRAM_WEBHOOK_SECRET_TOKEN
  bot_token_env: TELEGRAM_BOT_TOKEN
deployment:
  public_base_url_env: PUBLIC_BASE_URL
  edge_host_env: EDGE_HOST
  edge_port_env: EDGE_PORT
  data_dir: /opt/fe-quiz-bot/data
  config_dir: /opt/fe-quiz-bot/config
  assets_dir: /opt/fe-quiz-bot/assets
  backups_dir: /opt/fe-quiz-bot/backups
`,
      "utf8"
    );

    await expect(loadAppConfig(invalidConfigPath)).rejects.toThrow(
      /Invalid app config[\s\S]*quiz\.total_questions[\s\S]*quiz\.weak_topic\.accuracy_threshold[\s\S]*ai\.model/
    );
  });

  it("rejects unknown config keys", async () => {
    const configDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-config-"));
    const invalidConfigPath = path.join(configDir, "app.yaml");
    await writeFile(
      invalidConfigPath,
      `
quiz:
  total_questions: 20
  requested_scope_questions: 15
  reinforcement_questions: 5
  recent_question_avoid_days: 7
  unsubmitted_token_ttl_days: 7
  unsubmitted_session_purge_days: 30
  typo_question_count: 99
  weak_topic:
    accuracy_threshold: 0.6
    min_answered: 3
  wrong_question:
    remove_after_consecutive_correct: 2
  rate_limit:
    get_quiz_per_ip_per_minute: 60
    submit_per_ip_per_minute: 10
    submit_per_token_per_minute: 3
topics:
  high_weight_topics: []
  aliases: {}
  standard_topic_mappings: {}
ai:
  provider: openai
  model: gpt-4.1-mini
  temperature: 0
  max_suggestions: 3
telegram:
  webhook_path_prefix: /telegram/webhook
  path_secret_env: TELEGRAM_WEBHOOK_PATH_SECRET
  header_secret_env: TELEGRAM_WEBHOOK_SECRET_TOKEN
  bot_token_env: TELEGRAM_BOT_TOKEN
deployment:
  public_base_url_env: PUBLIC_BASE_URL
  edge_host_env: EDGE_HOST
  edge_port_env: EDGE_PORT
  data_dir: /opt/fe-quiz-bot/data
  config_dir: /opt/fe-quiz-bot/config
  assets_dir: /opt/fe-quiz-bot/assets
  backups_dir: /opt/fe-quiz-bot/backups
`,
      "utf8"
    );

    await expect(loadAppConfig(invalidConfigPath)).rejects.toThrow(
      /Invalid app config[\s\S]*quiz[\s\S]*Unrecognized key/
    );
  });

  it("rejects high weight topics that are not standard topics", async () => {
    const configDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-config-"));
    const invalidConfigPath = path.join(configDir, "app.yaml");
    await writeFile(
      invalidConfigPath,
      `
quiz:
  total_questions: 20
  requested_scope_questions: 15
  reinforcement_questions: 5
  recent_question_avoid_days: 7
  unsubmitted_token_ttl_days: 7
  unsubmitted_session_purge_days: 30
  weak_topic:
    accuracy_threshold: 0.6
    min_answered: 3
  wrong_question:
    remove_after_consecutive_correct: 2
  rate_limit:
    get_quiz_per_ip_per_minute: 60
    submit_per_ip_per_minute: 10
    submit_per_token_per_minute: 3
topics:
  standard_topics:
    - データベース
  high_weight_topics:
    - 存在しないテーマ
  aliases:
    データベース:
      - DB
  standard_topic_mappings: {}
ai:
  provider: openai
  model: gpt-4.1-mini
  temperature: 0
  max_suggestions: 3
telegram:
  webhook_path_prefix: /telegram/webhook
  path_secret_env: TELEGRAM_WEBHOOK_PATH_SECRET
  header_secret_env: TELEGRAM_WEBHOOK_SECRET_TOKEN
  bot_token_env: TELEGRAM_BOT_TOKEN
deployment:
  public_base_url_env: PUBLIC_BASE_URL
  edge_host_env: EDGE_HOST
  edge_port_env: EDGE_PORT
  data_dir: /opt/fe-quiz-bot/data
  config_dir: /opt/fe-quiz-bot/config
  assets_dir: /opt/fe-quiz-bot/assets
  backups_dir: /opt/fe-quiz-bot/backups
`,
      "utf8"
    );

    await expect(loadAppConfig(invalidConfigPath)).rejects.toThrow(
      /Invalid app config[\s\S]*high_weight_topics must be standard topics/
    );
  });
});

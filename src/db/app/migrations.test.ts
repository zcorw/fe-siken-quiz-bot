/**
 * @vitest-environment node
 */
import Database from "better-sqlite3";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const migrationsDir = join(process.cwd(), "drizzle");

const loadMigrationSql = async () => {
  expect(
    existsSync(migrationsDir),
    "Expected Drizzle migration output in drizzle/"
  ).toBe(true);

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  expect(
    migrationFiles.length,
    "Expected at least one SQL migration"
  ).toBeGreaterThan(0);

  return migrationFiles
    .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
    .join("\n");
};

describe("app sqlite Drizzle migrations", () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { force: true, recursive: true });
      tempDir = undefined;
    }
  });

  test("apply to a temporary SQLite database with core tables and constraints", async () => {
    tempDir = mkdtempSync(join(tmpdir(), "fe-quiz-migrations-"));
    const db = new Database(join(tempDir, "app.sqlite"));

    try {
      db.exec(await loadMigrationSql());

      const tables = db
        .prepare(
          "select name from sqlite_master where type = 'table' order by name"
        )
        .all()
        .map((row) => (row as { name: string }).name);

      expect(tables).toEqual(
        expect.arrayContaining([
          "answer_records",
          "quiz_session_questions",
          "quiz_sessions",
          "scope_parse_logs",
          "user_question_stats",
          "user_topic_stats",
          "users",
        ])
      );

      const quizSessionsSql = db
        .prepare(
          "select sql from sqlite_master where type = 'table' and name = ?"
        )
        .get("quiz_sessions") as { sql: string };
      expect(quizSessionsSql.sql).toContain(
        "quiz_sessions_total_questions_20_check"
      );
      expect(quizSessionsSql.sql).toContain(
        'CHECK("quiz_sessions"."total_questions" = 20)'
      );

      const questionIndexes = db
        .prepare("pragma index_list('quiz_session_questions')")
        .all()
        .map((row) => (row as { name: string; unique: number }).name);
      expect(questionIndexes).toEqual(
        expect.arrayContaining([
          "quiz_session_questions_session_index_unique",
          "quiz_session_questions_session_url_unique",
        ])
      );

      const userQuestionStatsColumns = db
        .prepare("pragma table_info('user_question_stats')")
        .all() as Array<{ name: string; pk: number }>;
      expect(
        userQuestionStatsColumns
          .filter((column) => column.pk > 0)
          .sort((left, right) => left.pk - right.pk)
          .map((column) => column.name)
      ).toEqual(["user_id", "question_url"]);

      const userTopicStatsColumns = db
        .prepare("pragma table_info('user_topic_stats')")
        .all() as Array<{ name: string; pk: number }>;
      expect(
        userTopicStatsColumns
          .filter((column) => column.pk > 0)
          .sort((left, right) => left.pk - right.pk)
          .map((column) => column.name)
      ).toEqual(["user_id", "topic_key", "topic_type"]);
    } finally {
      db.close();
    }
  });
});

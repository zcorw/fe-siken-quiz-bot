import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, test } from "vitest";

import {
  answerRecords,
  quizSessionQuestions,
  quizSessions,
  scopeParseLogs,
  userQuestionStats,
  users,
  userTopicStats,
} from "./schema";

type TableConfig = ReturnType<typeof getTableConfig>;

const columnMap = (config: TableConfig) =>
  Object.fromEntries(config.columns.map((column) => [column.name, column]));

const uniqueIndexColumns = (config: TableConfig) =>
  config.indexes
    .filter((index) => index.config.unique)
    .map((index) =>
      index.config.columns
        .map((column) => ("name" in column ? column.name : ""))
        .join(",")
    );

const primaryKeyColumns = (config: TableConfig) =>
  config.primaryKeys.map((key) =>
    key.columns.map((column) => column.name).join(",")
  );

const foreignKeyColumns = (config: TableConfig) =>
  config.foreignKeys.map((key) =>
    key
      .reference()
      .columns.map((column) => column.name)
      .join(",")
  );

const checkNames = (config: TableConfig) =>
  config.checks.map((check) => check.name);

const checkExpressionParts = (check: TableConfig["checks"][number]) =>
  (
    check.value as unknown as {
      queryChunks: Array<{ name?: string; value?: string[] }>;
    }
  ).queryChunks.map((chunk) => chunk.name ?? chunk.value?.join("") ?? "");

describe("app sqlite Drizzle schema", () => {
  const requiredTables = {
    users,
    quizSessions,
    quizSessionQuestions,
    answerRecords,
    userQuestionStats,
    userTopicStats,
    scopeParseLogs,
  };

  test("exports all required app tables with expected database names", () => {
    expect(
      Object.fromEntries(
        Object.entries(requiredTables).map(([exportName, table]) => [
          exportName,
          getTableConfig(table).name,
        ])
      )
    ).toEqual({
      users: "users",
      quizSessions: "quiz_sessions",
      quizSessionQuestions: "quiz_session_questions",
      answerRecords: "answer_records",
      userQuestionStats: "user_question_stats",
      userTopicStats: "user_topic_stats",
      scopeParseLogs: "scope_parse_logs",
    });
  });

  test("defines user and quiz session identity constraints", () => {
    const userColumns = columnMap(getTableConfig(users));
    expect(userColumns.id.primary).toBe(true);
    expect(userColumns.telegram_user_id.notNull).toBe(true);
    expect(userColumns.telegram_user_id.isUnique).toBe(true);

    const sessionConfig = getTableConfig(quizSessions);
    const sessionColumns = columnMap(sessionConfig);
    expect(sessionColumns.id.primary).toBe(true);
    expect(sessionColumns.token.notNull).toBe(true);
    expect(sessionColumns.token.isUnique).toBe(true);
    expect(sessionColumns.user_id.notNull).toBe(true);
    expect(foreignKeyColumns(sessionConfig)).toContain("user_id");
    expect(checkNames(sessionConfig)).toContain(
      "quiz_sessions_total_questions_20_check"
    );
    expect(
      checkExpressionParts(
        sessionConfig.checks.find(
          (check) => check.name === "quiz_sessions_total_questions_20_check"
        )!
      )
    ).toEqual(["", "total_questions", " = 20"]);
  });

  test("defines quiz question and answer uniqueness constraints", () => {
    const questionConfig = getTableConfig(quizSessionQuestions);
    const questionColumns = columnMap(questionConfig);
    expect(questionColumns.id.primary).toBe(true);
    expect(questionColumns.quiz_session_id.notNull).toBe(true);
    expect(questionColumns.question_url.notNull).toBe(true);
    expect(questionColumns.question_index.notNull).toBe(true);
    expect(foreignKeyColumns(questionConfig)).toContain("quiz_session_id");
    expect(uniqueIndexColumns(questionConfig)).toEqual(
      expect.arrayContaining([
        "quiz_session_id,question_index",
        "quiz_session_id,question_url",
      ])
    );

    const answerConfig = getTableConfig(answerRecords);
    const answerColumns = columnMap(answerConfig);
    expect(answerColumns.id.primary).toBe(true);
    expect(answerColumns.quiz_session_id.notNull).toBe(true);
    expect(answerColumns.quiz_session_question_id.notNull).toBe(true);
    expect(answerColumns.user_id.notNull).toBe(true);
    expect(answerColumns.is_correct.getSQLType()).toBe("integer");
    expect(uniqueIndexColumns(answerConfig)).toContain(
      "quiz_session_question_id"
    );
    expect(foreignKeyColumns(answerConfig)).toEqual(
      expect.arrayContaining([
        "quiz_session_id",
        "quiz_session_question_id",
        "user_id",
      ])
    );
  });

  test("defines composite statistic primary keys and nullable scope log user", () => {
    const questionStatsConfig = getTableConfig(userQuestionStats);
    const questionStatsColumns = columnMap(questionStatsConfig);
    expect(primaryKeyColumns(questionStatsConfig)).toContain(
      "user_id,question_url"
    );
    expect(questionStatsColumns.active_wrong.getSQLType()).toBe("integer");
    expect(questionStatsColumns.last_is_correct.getSQLType()).toBe("integer");
    expect(foreignKeyColumns(questionStatsConfig)).toContain("user_id");

    const topicStatsConfig = getTableConfig(userTopicStats);
    expect(primaryKeyColumns(topicStatsConfig)).toContain(
      "user_id,topic_key,topic_type"
    );
    expect(foreignKeyColumns(topicStatsConfig)).toContain("user_id");

    const scopeConfig = getTableConfig(scopeParseLogs);
    const scopeColumns = columnMap(scopeConfig);
    expect(scopeColumns.id.primary).toBe(true);
    expect(scopeColumns.user_id.notNull).toBe(false);
    expect(foreignKeyColumns(scopeConfig)).toContain("user_id");
  });
});

import { sql } from "drizzle-orm";
import {
  check,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  telegramUserId: text("telegram_user_id").notNull().unique(),
  telegramUsername: text("telegram_username"),
  telegramFirstName: text("telegram_first_name"),
  telegramLastName: text("telegram_last_name"),
  createdAt: text("created_at"),
  lastSeenAt: text("last_seen_at"),
});

export const quizSessions = sqliteTable(
  "quiz_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    rawScopeInput: text("raw_scope_input").notNull(),
    matchedScopeJson: text("matched_scope_json"),
    selectionSummaryJson: text("selection_summary_json"),
    status: text("status").notNull(),
    totalQuestions: integer("total_questions").notNull(),
    correctCount: integer("correct_count"),
    incorrectCount: integer("incorrect_count"),
    createdAt: text("created_at"),
    submittedAt: text("submitted_at"),
    expiresAt: text("expires_at"),
    purgeAfterAt: text("purge_after_at"),
  },
  (table) => [
    check(
      "quiz_sessions_total_questions_20_check",
      sql`${table.totalQuestions} = 20`
    ),
  ]
);

export const quizSessionQuestions = sqliteTable(
  "quiz_session_questions",
  {
    id: text("id").primaryKey(),
    quizSessionId: text("quiz_session_id")
      .notNull()
      .references(() => quizSessions.id),
    questionUrl: text("question_url").notNull(),
    questionIndex: integer("question_index").notNull(),
    sourceType: text("source_type").notNull(),
    sourceTopic: text("source_topic"),
    sourceCategory: text("source_category"),
    selectionReason: text("selection_reason"),
  },
  (table) => [
    uniqueIndex("quiz_session_questions_session_index_unique").on(
      table.quizSessionId,
      table.questionIndex
    ),
    uniqueIndex("quiz_session_questions_session_url_unique").on(
      table.quizSessionId,
      table.questionUrl
    ),
  ]
);

export const answerRecords = sqliteTable(
  "answer_records",
  {
    id: text("id").primaryKey(),
    quizSessionId: text("quiz_session_id")
      .notNull()
      .references(() => quizSessions.id),
    quizSessionQuestionId: text("quiz_session_question_id")
      .notNull()
      .references(() => quizSessionQuestions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    questionUrl: text("question_url").notNull(),
    selectedAnswer: text("selected_answer").notNull(),
    correctAnswer: text("correct_answer").notNull(),
    isCorrect: integer("is_correct").notNull(),
    answeredAt: text("answered_at"),
  },
  (table) => [
    uniqueIndex("answer_records_session_question_unique").on(
      table.quizSessionQuestionId
    ),
  ]
);

export const userQuestionStats = sqliteTable(
  "user_question_stats",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    questionUrl: text("question_url").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    correctCount: integer("correct_count").notNull(),
    incorrectCount: integer("incorrect_count").notNull(),
    lastAnsweredAt: text("last_answered_at"),
    lastIsCorrect: integer("last_is_correct"),
    activeWrong: integer("active_wrong").notNull(),
    consecutiveCorrectAfterWrong: integer(
      "consecutive_correct_after_wrong"
    ).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.questionUrl],
      name: "user_question_stats_pk",
    }),
  ]
);

export const userTopicStats = sqliteTable(
  "user_topic_stats",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    topicKey: text("topic_key").notNull(),
    topicType: text("topic_type").notNull(),
    attemptCount: integer("attempt_count").notNull(),
    correctCount: integer("correct_count").notNull(),
    incorrectCount: integer("incorrect_count").notNull(),
    accuracy: real("accuracy").notNull(),
    lastAnsweredAt: text("last_answered_at"),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.topicKey, table.topicType],
      name: "user_topic_stats_pk",
    }),
  ]
);

export const scopeParseLogs = sqliteTable("scope_parse_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  rawInput: text("raw_input"),
  method: text("method"),
  matchedScopeJson: text("matched_scope_json"),
  suggestionsJson: text("suggestions_json"),
  status: text("status"),
  errorMessage: text("error_message"),
  createdAt: text("created_at"),
});

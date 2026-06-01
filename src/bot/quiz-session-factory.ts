import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

import type { AppDrizzleDb } from "@/db/app/client";
import { createQuizSession } from "@/db/app/repositories/quiz-sessions";
import { upsertTelegramUser } from "@/db/app/repositories/users";
import {
  findQuestionCandidates,
  type QuestionCandidateRow,
} from "@/db/question-bank/queries";
import type { ScopeParseResult } from "@/quiz/scope-match";
import { getMinorToMajorCategoryMap, type AppConfig } from "@/config/schema";

export interface TelegramUserInput {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface CreateQuizSessionFromScopeMessageInput {
  appDb: AppDrizzleDb;
  questionDb: Database.Database;
  rawScopeInput: string;
  matchedScope: ScopeParseResult;
  telegramUser?: TelegramUserInput;
  nowIso: string;
  sessionIdFactory?: () => string;
  tokenFactory?: () => string;
  topicsConfig?: AppConfig["topics"];
}

export async function createQuizSessionFromScopeMessage({
  appDb,
  matchedScope,
  nowIso,
  questionDb,
  rawScopeInput,
  sessionIdFactory = randomUUID,
  telegramUser,
  tokenFactory = randomUUID,
  topicsConfig,
}: CreateQuizSessionFromScopeMessageInput): Promise<{ token: string }> {
  if (telegramUser === undefined) {
    throw new Error("Telegram user is required to create a quiz session.");
  }

  const user = await upsertTelegramUser(appDb, {
    nowIso,
    telegramFirstName: telegramUser.firstName ?? null,
    telegramLastName: telegramUser.lastName ?? null,
    telegramUserId: String(telegramUser.id),
    telegramUsername: telegramUser.username ?? null,
  });

  const matchedTopic = matchedScope.majorCategory ?? matchedScope.matchedTopics[0];
  const matchedCategory =
    matchedScope.minorCategory ?? matchedScope.matchedCategories[0];
  const candidates = resolveQuestionCandidates(questionDb, {
    matchedCategory,
    matchedTopic,
    topicsConfig,
  }).slice(0, 20);

  if (candidates.length !== 20) {
    throw new Error(
      `Expected 20 question candidates, received ${candidates.length}.`
    );
  }

  const sessionId = sessionIdFactory();
  const token = tokenFactory();

  await createQuizSession(appDb, {
    createdAt: nowIso,
    expiresAt: addDays(nowIso, 7),
    id: sessionId,
    matchedScopeJson: {
      candidateMinorCategories: matchedScope.candidateMinorCategories,
      majorCategory: matchedScope.majorCategory ?? null,
      matchedCategories: matchedScope.matchedCategories,
      matchedTopics: matchedScope.matchedTopics,
      method: matchedScope.method,
      minorCategory: matchedScope.minorCategory ?? null,
      scopeType: matchedScope.scopeType,
      status: matchedScope.status,
      suggestions: matchedScope.suggestions,
    },
    purgeAfterAt: addDays(nowIso, 37),
    rawScopeInput,
    selectionSummaryJson: {
      highWeightTopicCount: 5,
      reinforcementCount: 5,
      requestedScopeCount: 15,
      weakTopicCount: 0,
      wrongQuestionCount: 0,
    },
    token,
    userId: user.id,
    questions: candidates.map((candidate, index) => ({
      id: `${sessionId}-question-${index + 1}`,
      questionIndex: index + 1,
      questionUrl: candidate.url,
      selectionReason:
        index < 15 ? "requested_scope" : "high_weight_topic_fallback",
      sourceCategory: candidate.category,
      sourceTopic: candidate.topic,
      sourceType: index < 15 ? "requested" : "reinforcement",
    })),
  });

  return { token };
}

function resolveQuestionCandidates(
  questionDb: Database.Database,
  {
    matchedCategory,
    matchedTopic,
    topicsConfig,
  }: {
    matchedCategory?: string;
    matchedTopic?: string;
    topicsConfig?: AppConfig["topics"];
  }
): QuestionCandidateRow[] {
  const directCandidates = findQuestionCandidates(questionDb, {
    category: matchedCategory,
    topic: matchedTopic,
  });

  if (directCandidates.length >= 20 || matchedTopic === undefined) {
    return directCandidates;
  }

  const mappedCandidates = findQuestionCandidates(questionDb).filter(
    (candidate) =>
      mapsToStandardTopic(candidate.category, matchedTopic, topicsConfig) ||
      mapsToStandardTopic(candidate.topic, matchedTopic, topicsConfig)
  );

  return dedupeCandidates([...directCandidates, ...mappedCandidates]);
}

function mapsToStandardTopic(
  sourceValue: string | null,
  standardTopic: string,
  topicsConfig?: AppConfig["topics"]
): boolean {
  if (sourceValue === null || topicsConfig === undefined) {
    return false;
  }

  return (
    getMinorToMajorCategoryMap(topicsConfig).get(sourceValue) === standardTopic
  );
}

function dedupeCandidates(
  candidates: QuestionCandidateRow[]
): QuestionCandidateRow[] {
  const seenUrls = new Set<string>();
  const deduped: QuestionCandidateRow[] = [];

  for (const candidate of candidates) {
    if (seenUrls.has(candidate.url)) {
      continue;
    }

    seenUrls.add(candidate.url);
    deduped.push(candidate);
  }

  return deduped;
}

function addDays(iso: string, days: number): string {
  const date = new Date(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

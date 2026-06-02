import { randomUUID } from "node:crypto";
import type Database from "better-sqlite3";

import type { AppDrizzleDb } from "@/db/app/client";
import {
  createQuizSession,
  findUserQuestionStatsByUrls,
} from "@/db/app/repositories/quiz-sessions";
import { upsertTelegramUser } from "@/db/app/repositories/users";
import {
  findQuestionCandidates,
  type QuestionCandidateRow,
} from "@/db/question-bank/queries";
import type { ScopeParseResult } from "@/quiz/scope-match";
import { getMinorToMajorCategoryMap, type AppConfig } from "@/config/schema";
import {
  selectSeededUniqueCandidates,
  selectWeightedSeededCandidates,
} from "@/quiz/question-selection";

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
  selectionSeedFactory?: () => string;
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
  selectionSeedFactory = randomUUID,
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

  const matchedTopic =
    matchedScope.scopeType === "topic_keyword"
      ? matchedScope.matchedTopics[0]
      : undefined;
  const matchedCategory =
    matchedScope.minorCategory ?? matchedScope.matchedCategories[0];
  const selectionSeed = selectionSeedFactory();
  const selection = await resolveQuestionSelection(appDb, questionDb, {
    candidateMinorCategories: matchedScope.candidateMinorCategories,
    majorCategory: matchedScope.majorCategory,
    matchedCategory,
    matchedTopic,
    minorCategory: matchedScope.minorCategory,
    selectionSeed,
    topicsConfig,
    userId: user.id,
  });
  const candidates = selection.candidates;

  if (candidates.length !== 20) {
    throw new Error(
      `Expected 20 question candidates, received ${candidates.length}.`
    );
  }

  const sessionId = sessionIdFactory();
  const token = tokenFactory();
  const selectedQuestions = selectSeededUniqueCandidates(
    candidates.map((candidate, index) => ({
      candidate,
      sourceType: index < 15 ? "requested" : "reinforcement",
      selectionReason:
        index < 15 ? "requested_scope" : "high_weight_topic_fallback",
      url: candidate.url,
    })),
    {
      count: 20,
      seed: `${selectionSeed}:display-order`,
    }
  );
  const requestedMinorCategories = listSelectedMinorCategories(
    candidates,
    matchedScope.candidateMinorCategories ?? []
  );

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
      primaryMinorCategory: matchedScope.minorCategory ?? null,
      randomizedReinforcement: true,
      randomizedRequestedScope: true,
      randomizationVersion: 1,
      reinforcementCount: 5,
      requestedMajorCategory: matchedScope.majorCategory ?? null,
      requestedMinorCategories,
      requestedScopeCount: 15,
      selectionSeed,
      siblingMinorCategoriesUsed: selection.siblingMinorCategoriesUsed,
      weakTopicCount: 0,
      wrongQuestionCount: 0,
    },
    token,
    userId: user.id,
    questions: selectedQuestions.map((selectedQuestion, index) => ({
      id: `${sessionId}-question-${index + 1}`,
      questionIndex: index + 1,
      questionUrl: selectedQuestion.candidate.url,
      selectionReason: selectedQuestion.selectionReason,
      sourceCategory: selectedQuestion.candidate.category,
      sourceTopic: selectedQuestion.candidate.topic,
      sourceType: selectedQuestion.sourceType,
    })),
  });

  return { token };
}

interface QuestionSelection {
  candidates: QuestionCandidateRow[];
  siblingMinorCategoriesUsed: string[];
}

async function resolveQuestionSelection(
  appDb: AppDrizzleDb,
  questionDb: Database.Database,
  {
    matchedCategory,
    matchedTopic,
    candidateMinorCategories,
    majorCategory,
    minorCategory,
    selectionSeed,
    topicsConfig,
    userId,
  }: {
    candidateMinorCategories?: string[];
    majorCategory?: string;
    matchedCategory?: string;
    matchedTopic?: string;
    minorCategory?: string;
    selectionSeed: string;
    topicsConfig?: AppConfig["topics"];
    userId: string;
  }
): Promise<QuestionSelection> {
  if (minorCategory !== undefined) {
    return resolveMinorCategorySelection(appDb, questionDb, {
      majorCategory,
      minorCategory,
      selectionSeed,
      topicsConfig,
      userId,
    });
  }

  if (
    candidateMinorCategories !== undefined &&
    candidateMinorCategories.length > 0
  ) {
    return {
      candidates: await selectWeightedCandidates(
        appDb,
        userId,
        findQuestionCandidates(questionDb, {
          categories: candidateMinorCategories,
        }),
        20,
        `${selectionSeed}:candidate-minors`
      ),
      siblingMinorCategoriesUsed: [],
    };
  }

  const directCandidates = findQuestionCandidates(questionDb, {
    category: matchedCategory,
    topic: matchedTopic,
  });

  if (directCandidates.length >= 20 || matchedTopic === undefined) {
    return {
      candidates: await selectWeightedCandidates(
        appDb,
        userId,
        directCandidates,
        20,
        `${selectionSeed}:direct`
      ),
      siblingMinorCategoriesUsed: [],
    };
  }

  const mappedCandidates = findQuestionCandidates(questionDb).filter(
    (candidate) =>
      mapsToStandardTopic(candidate.category, matchedTopic, topicsConfig) ||
      mapsToStandardTopic(candidate.topic, matchedTopic, topicsConfig)
  );

  return {
    candidates: await selectWeightedCandidates(
      appDb,
      userId,
      dedupeCandidates([...directCandidates, ...mappedCandidates]),
      20,
      `${selectionSeed}:mapped`
    ),
    siblingMinorCategoriesUsed: [],
  };
}

async function resolveMinorCategorySelection(
  appDb: AppDrizzleDb,
  questionDb: Database.Database,
  {
    majorCategory,
    minorCategory,
    selectionSeed,
    topicsConfig,
    userId,
  }: {
    majorCategory?: string;
    minorCategory: string;
    selectionSeed: string;
    topicsConfig?: AppConfig["topics"];
    userId: string;
  }
): Promise<QuestionSelection> {
  const primaryCandidates = findQuestionCandidates(questionDb, {
    categories: [minorCategory],
  });
  const siblingMinorCategories =
    majorCategory === undefined || topicsConfig === undefined
      ? []
      : (topicsConfig.category_tree[majorCategory] ?? []).filter(
          (category) => category !== minorCategory
        );

  if (primaryCandidates.length >= 15) {
    const requestedCandidates = await selectWeightedCandidates(
      appDb,
      userId,
      primaryCandidates,
      15,
      `${selectionSeed}:minor-requested`
    );
    const requestedUrls = new Set(
      requestedCandidates.map((candidate) => candidate.url)
    );
    const remainingPrimaryCandidates = primaryCandidates.filter(
      (candidate) => !requestedUrls.has(candidate.url)
    );
    const siblingReinforcementCandidates = findQuestionCandidates(questionDb, {
      categories: siblingMinorCategories,
    });
    const reinforcementCandidates = await selectWeightedCandidates(
      appDb,
      userId,
      [...remainingPrimaryCandidates, ...siblingReinforcementCandidates],
      5,
      `${selectionSeed}:minor-reinforcement`
    );

    return {
      candidates: [...requestedCandidates, ...reinforcementCandidates],
      siblingMinorCategoriesUsed: [],
    };
  }

  const siblingCandidates = findQuestionCandidates(questionDb, {
    categories: siblingMinorCategories,
  });
  const weightedPrimaryCandidates = await selectWeightedCandidates(
    appDb,
    userId,
    primaryCandidates,
    primaryCandidates.length,
    `${selectionSeed}:minor-primary-requested`
  );
  const siblingRequestedCandidates = await selectWeightedCandidates(
    appDb,
    userId,
    siblingCandidates,
    15 - weightedPrimaryCandidates.length,
    `${selectionSeed}:minor-sibling-requested`
  );
  const requestedCandidates = [
    ...weightedPrimaryCandidates,
    ...siblingRequestedCandidates,
  ];
  const requestedUrls = new Set(
    requestedCandidates.map((candidate) => candidate.url)
  );
  const reinforcementCandidates = await selectWeightedCandidates(
    appDb,
    userId,
    dedupeCandidates([...primaryCandidates, ...siblingCandidates]).filter(
      (candidate) => !requestedUrls.has(candidate.url)
    ),
    5,
    `${selectionSeed}:minor-sibling-reinforcement`
  );

  return {
    candidates: [...requestedCandidates, ...reinforcementCandidates],
    siblingMinorCategoriesUsed: listSelectedMinorCategories(
      requestedCandidates,
      siblingMinorCategories
    ),
  };
}

async function selectWeightedCandidates(
  appDb: AppDrizzleDb,
  userId: string,
  candidates: QuestionCandidateRow[],
  count: number,
  seed: string
): Promise<QuestionCandidateRow[]> {
  const statsByUrl = await findUserQuestionStatsByUrls(appDb, {
    questionUrls: candidates.map((candidate) => candidate.url),
    userId,
  });

  return selectWeightedSeededCandidates(candidates, {
    count,
    seed,
    statsByUrl,
  });
}

function listSelectedMinorCategories(
  candidates: QuestionCandidateRow[],
  configuredMinorCategories: string[]
): string[] {
  const selectedCategories = new Set(
    candidates
      .map((candidate) => candidate.category)
      .filter((category): category is string => category !== null)
  );

  return configuredMinorCategories.filter((category) =>
    selectedCategories.has(category)
  );
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

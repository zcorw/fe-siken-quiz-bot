import type { AppDrizzleDb } from "../client";
import { quizSessionQuestions, quizSessions } from "../schema";

type JsonPrimitive = string | number | boolean | null;
type JsonValue =
  | JsonPrimitive
  | { readonly [key: string]: JsonValue }
  | readonly JsonValue[];

export interface CreateQuizSessionQuestionInput {
  id: string;
  questionUrl: string;
  questionIndex: number;
  sourceType: string;
  sourceTopic: string | null;
  sourceCategory: string | null;
  selectionReason: string | null;
}

export interface CreateQuizSessionInput {
  id: string;
  token: string;
  userId: string;
  rawScopeInput: string;
  matchedScopeJson: string | JsonValue;
  selectionSummaryJson: string | JsonValue;
  createdAt: string;
  expiresAt: string;
  purgeAfterAt: string;
  questions: CreateQuizSessionQuestionInput[];
}

function serializeJson(value: JsonValue): string {
  return JSON.stringify(value);
}

function validateQuestionIndexes(
  questions: CreateQuizSessionQuestionInput[]
): void {
  const indexes = questions
    .map((question) => question.questionIndex)
    .sort((left, right) => left - right);

  const hasRequiredSequence = indexes.every(
    (questionIndex, index) => questionIndex === index + 1
  );

  if (!hasRequiredSequence) {
    throw new Error(
      "createQuizSession question indexes must be exactly 1 through 20."
    );
  }
}

export async function createQuizSession(
  appDb: AppDrizzleDb,
  input: CreateQuizSessionInput
): Promise<void> {
  if (input.questions.length !== 20) {
    throw new Error(
      `createQuizSession requires exactly 20 questions, received ${input.questions.length}.`
    );
  }
  validateQuestionIndexes(input.questions);

  appDb.transaction((tx) => {
    tx.insert(quizSessions)
      .values({
        id: input.id,
        token: input.token,
        userId: input.userId,
        rawScopeInput: input.rawScopeInput,
        matchedScopeJson: serializeJson(input.matchedScopeJson),
        selectionSummaryJson: serializeJson(input.selectionSummaryJson),
        status: "created",
        totalQuestions: 20,
        correctCount: null,
        incorrectCount: null,
        submittedAt: null,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
        purgeAfterAt: input.purgeAfterAt,
      })
      .run();

    tx.insert(quizSessionQuestions)
      .values(
        input.questions.map((question) => ({
          id: question.id,
          quizSessionId: input.id,
          questionUrl: question.questionUrl,
          questionIndex: question.questionIndex,
          sourceType: question.sourceType,
          sourceTopic: question.sourceTopic,
          sourceCategory: question.sourceCategory,
          selectionReason: question.selectionReason,
        }))
      )
      .run();
  });
}

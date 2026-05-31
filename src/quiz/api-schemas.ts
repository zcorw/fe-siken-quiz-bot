import { z } from "zod";

const nonEmptyStringSchema = z.string().min(1);

export const quizChoiceDtoSchema = z.strictObject({
  label: nonEmptyStringSchema,
  text: z.string(),
});

export const activeQuizQuestionDtoSchema = z.strictObject({
  index: z.number().int().positive(),
  questionUrl: nonEmptyStringSchema,
  questionText: z.string().nullable(),
  choices: z.array(quizChoiceDtoSchema),
  hasImages: z.boolean(),
});

export const activeQuizResponseSchema = z.strictObject({
  status: z.literal("active"),
  token: nonEmptyStringSchema,
  totalQuestions: z.number().int().positive(),
  questions: z.array(activeQuizQuestionDtoSchema),
});

export const quizSummaryDtoSchema = z.strictObject({
  totalQuestions: z.number().int().positive(),
  correctCount: z.number().int().min(0),
  incorrectCount: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),
});

export const selectionSummaryDtoSchema = z.strictObject({
  requestedScopeCount: z.number().int().min(0),
  reinforcementCount: z.number().int().min(0),
  wrongQuestionCount: z.number().int().min(0),
  weakTopicCount: z.number().int().min(0),
  highWeightTopicCount: z.number().int().min(0),
});

export const submittedQuizQuestionDtoSchema =
  activeQuizQuestionDtoSchema.extend({
    selectedAnswer: nonEmptyStringSchema,
    correctAnswer: nonEmptyStringSchema,
    isCorrect: z.boolean(),
    explanation: z.string().nullable(),
    sourceUrl: nonEmptyStringSchema,
  });

export const submittedQuizResponseSchema = z.strictObject({
  status: z.literal("submitted"),
  token: nonEmptyStringSchema,
  summary: quizSummaryDtoSchema,
  selectionSummary: selectionSummaryDtoSchema,
  questions: z.array(submittedQuizQuestionDtoSchema),
});

export const submitQuizAnswerSchema = z.strictObject({
  questionIndex: z.number().int().positive(),
  selectedAnswer: nonEmptyStringSchema,
});

export const submitQuizRequestSchema = z.strictObject({
  answers: z.array(submitQuizAnswerSchema).length(20),
});

export const apiErrorCodeSchema = z.enum([
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "QUIZ_LOAD_FAILED",
  "QUIZ_ALREADY_SUBMITTED",
  "INCOMPLETE_ANSWERS",
  "INVALID_ANSWER",
  "QUESTION_NOT_IN_SESSION",
  "SUBMIT_FAILED",
  "SCOPE_NO_MATCH",
  "AI_PROVIDER_UNAVAILABLE",
  "TELEGRAM_SEND_FAILED",
]);

export const apiErrorResponseSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: nonEmptyStringSchema,
  }),
});

export type ActiveQuizResponseDto = z.infer<typeof activeQuizResponseSchema>;
export type SubmittedQuizResponseDto = z.infer<
  typeof submittedQuizResponseSchema
>;
export type SubmitQuizRequestDto = z.infer<typeof submitQuizRequestSchema>;
export type ApiErrorResponseDto = z.infer<typeof apiErrorResponseSchema>;

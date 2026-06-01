import OpenAI from "openai";
import { z } from "zod";

import type { AppConfig } from "@/config/schema";
import {
  parseLocalScope,
  type QuestionBankKeywordIndex,
  type ScopeParseResult,
} from "@/quiz/scope-match";

interface OpenAIResponseCreateParams {
  model: string;
  temperature: number;
  input: Array<{ role: "system" | "user"; content: string }>;
  text: {
    format: {
      type: "json_schema";
      name: string;
      strict: true;
      schema: Record<string, unknown>;
    };
  };
}

export interface OpenAIScopeClient {
  responses: {
    create(
      params: OpenAIResponseCreateParams
    ): Promise<{ output_text: string }>;
  };
}

export interface AvailableScopeForAI {
  standardTopics: string[];
  categories: string[];
  topics: string[];
}

export interface ParseScopeWithOpenAIInput {
  client: OpenAIScopeClient;
  input: string;
  aiConfig: AppConfig["ai"];
  availableScope: AvailableScopeForAI;
}

export interface ParseScopeInput extends ParseScopeWithOpenAIInput {
  topicsConfig: AppConfig["topics"];
  questionBankKeywords: QuestionBankKeywordIndex;
}

const openAIScopeParseResultSchema = z.strictObject({
  matchedTopics: z.array(z.string()),
  matchedCategories: z.array(z.string()),
  suggestions: z.array(z.string()),
  method: z.literal("openai"),
  status: z.union([z.literal("matched"), z.literal("no_match")]),
});

const scopeParseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "matchedTopics",
    "matchedCategories",
    "suggestions",
    "method",
    "status",
  ],
  properties: {
    matchedTopics: { type: "array", items: { type: "string" } },
    matchedCategories: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
    method: { type: "string", enum: ["openai"] },
    status: { type: "string", enum: ["matched", "no_match"] },
  },
};

export function createOpenAIScopeClient(apiKey: string): OpenAIScopeClient {
  return new OpenAI({ apiKey });
}

export async function parseScope(
  input: ParseScopeInput
): Promise<ScopeParseResult> {
  const localResult = parseLocalScope(
    input.input,
    input.topicsConfig,
    input.questionBankKeywords,
    input.aiConfig.max_suggestions
  );

  if (localResult.status === "matched") {
    return localResult;
  }

  try {
    return await parseScopeWithOpenAI(input);
  } catch {
    return {
      candidateMinorCategories: [],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "openai_unavailable",
      minorCategory: undefined,
      scopeType: "ai_unavailable",
      status: "ai_unavailable",
      suggestions: localResult.suggestions,
    };
  }
}

export async function parseScopeWithOpenAI({
  client,
  input,
  aiConfig,
  availableScope,
}: ParseScopeWithOpenAIInput): Promise<ScopeParseResult> {
  const response = await client.responses.create({
    model: aiConfig.model,
    temperature: aiConfig.temperature,
    input: [
      {
        role: "system",
        content:
          "You parse Japanese IT exam practice scope requests. Return only the structured JSON result.",
      },
      {
        role: "user",
        content: JSON.stringify({
          input,
          allowed: availableScope,
          rules: [
            "Use only available topics or categories.",
            "Do not create questions.",
            "Do not rewrite question text.",
            "Do not answer or explain exam questions.",
          ],
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "scope_parse_result",
        strict: true,
        schema: scopeParseJsonSchema,
      },
    },
  });

  return parseOpenAIOutput(response.output_text, availableScope);
}

function parseOpenAIOutput(
  outputText: string,
  availableScope: AvailableScopeForAI
): ScopeParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText) as unknown;
  } catch (error) {
    throw new Error("Invalid OpenAI scope parse JSON", { cause: error });
  }

  const result = openAIScopeParseResultSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error("Invalid OpenAI scope parse result");
  }

  return restrictToAvailableScope(
    {
      candidateMinorCategories: [],
      majorCategory: undefined,
      minorCategory: undefined,
      scopeType: deriveOpenAIScopeType(result.data),
      ...result.data,
    },
    availableScope
  );
}

function deriveOpenAIScopeType(
  result: z.infer<typeof openAIScopeParseResultSchema>
): ScopeParseResult["scopeType"] {
  if (result.status === "no_match") {
    return "no_match";
  }

  if (result.matchedCategories.length > 0) {
    return "category_keyword";
  }

  if (result.matchedTopics.length > 0) {
    return "topic_keyword";
  }

  return "no_match";
}

function restrictToAvailableScope(
  result: ScopeParseResult,
  availableScope: AvailableScopeForAI
): ScopeParseResult {
  const allowedTopics = new Set([
    ...availableScope.standardTopics,
    ...availableScope.topics,
  ]);
  const allowedCategories = new Set(availableScope.categories);
  const allowedSuggestions = new Set([
    ...availableScope.standardTopics,
    ...availableScope.topics,
    ...availableScope.categories,
  ]);

  const matchedTopics = result.matchedTopics.filter((topic) =>
    allowedTopics.has(topic)
  );
  const matchedCategories = result.matchedCategories.filter((category) =>
    allowedCategories.has(category)
  );
  const suggestions = result.suggestions.filter((suggestion) =>
    allowedSuggestions.has(suggestion)
  );

  return {
    ...result,
    matchedCategories,
    matchedTopics,
    scopeType:
      matchedTopics.length > 0 || matchedCategories.length > 0
        ? result.scopeType
        : "no_match",
    status:
      matchedTopics.length > 0 || matchedCategories.length > 0
        ? "matched"
        : "no_match",
    suggestions,
  };
}

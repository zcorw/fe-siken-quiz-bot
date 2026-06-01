import OpenAI from "openai";
import { z } from "zod";

import type { AppConfig } from "@/config/schema";
import {
  parseLocalScope,
  type ScopeCandidate,
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
  majorCategories?: string[];
  minorCategories?: Array<{
    majorCategory: string;
    minorCategory: string;
  }>;
  standardTopics?: string[];
  categories?: string[];
  topics?: string[];
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

const openAIScopeCandidateResultSchema = z.strictObject({
  candidates: z.array(
    z.strictObject({
      scopeType: z.union([
        z.literal("major_category"),
        z.literal("minor_category"),
      ]),
      name: z.string(),
    })
  ),
  method: z.literal("openai"),
  status: z.union([z.literal("matched"), z.literal("no_match")]),
});

const scopeParseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["candidates", "method", "status"],
  properties: {
    candidates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["scopeType", "name"],
        properties: {
          scopeType: {
            type: "string",
            enum: ["major_category", "minor_category"],
          },
          name: { type: "string" },
        },
      },
    },
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

  if (
    localResult.status === "matched" ||
    localResult.status === "needs_single_scope"
  ) {
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
  const normalizedAvailableScope = normalizeAvailableScope(availableScope);
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
          rawInput: input,
          majorCategories: normalizedAvailableScope.majorCategories,
          minorCategories: normalizedAvailableScope.minorCategories,
          rules: [
            "Return only existing major or minor categories from the provided lists.",
            "Do not create new categories.",
            "Do not create questions.",
            "Do not rewrite question text.",
            "Do not answer or explain exam questions.",
            "Return candidates as suggestions for Telegram buttons; do not mark them as final quiz creation decisions.",
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

  return parseOpenAIOutput(response.output_text, normalizedAvailableScope);
}

function parseOpenAIOutput(
  outputText: string,
  availableScope: NormalizedAvailableScopeForAI
): ScopeParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(outputText) as unknown;
  } catch (error) {
    throw new Error("Invalid OpenAI scope parse JSON", { cause: error });
  }

  const candidateResult = openAIScopeCandidateResultSchema.safeParse(parsed);

  if (candidateResult.success) {
    return parseOpenAICandidates(candidateResult.data, availableScope);
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
  availableScope: NormalizedAvailableScopeForAI
): ScopeParseResult {
  const allowedTopics = new Set([
    ...availableScope.majorCategories,
    ...availableScope.topics,
  ]);
  const allowedCategories = new Set(
    availableScope.minorCategories.map((category) => category.minorCategory)
  );
  const allowedSuggestions = new Set([
    ...availableScope.majorCategories,
    ...availableScope.topics,
    ...availableScope.minorCategories.map((category) => category.minorCategory),
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

interface NormalizedAvailableScopeForAI {
  majorCategories: string[];
  minorCategories: Array<{
    majorCategory: string;
    minorCategory: string;
  }>;
  topics: string[];
}

function normalizeAvailableScope(
  availableScope: AvailableScopeForAI
): NormalizedAvailableScopeForAI {
  const majorCategories =
    availableScope.majorCategories ??
    availableScope.standardTopics ??
    availableScope.topics ??
    [];

  return {
    majorCategories,
    minorCategories:
      availableScope.minorCategories ??
      (availableScope.categories ?? []).map((minorCategory) => ({
        majorCategory: "",
        minorCategory,
      })),
    topics: availableScope.topics ?? [],
  };
}

function parseOpenAICandidates(
  result: z.infer<typeof openAIScopeCandidateResultSchema>,
  availableScope: NormalizedAvailableScopeForAI
): ScopeParseResult {
  const candidateScopes = filterOpenAICandidates(result.candidates, availableScope);

  return {
    candidateMinorCategories: [],
    candidateScopes,
    majorCategory: undefined,
    matchedCategories: [],
    matchedTopics: [],
    method: "openai",
    minorCategory: undefined,
    scopeType: "no_match",
    status: "no_match",
    suggestions: candidateScopes.map((candidate) => candidate.name),
  };
}

function filterOpenAICandidates(
  candidates: z.infer<typeof openAIScopeCandidateResultSchema>["candidates"],
  availableScope: NormalizedAvailableScopeForAI
): ScopeCandidate[] {
  const majorCategories = new Set(availableScope.majorCategories);
  const minorToMajorCategory = new Map(
    availableScope.minorCategories.map(({ majorCategory, minorCategory }) => [
      minorCategory,
      majorCategory,
    ])
  );
  const filtered: ScopeCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const majorCategory =
      candidate.scopeType === "major_category"
        ? candidate.name
        : minorToMajorCategory.get(candidate.name);

    if (
      majorCategory === undefined ||
      !majorCategories.has(majorCategory) ||
      seen.has(`${candidate.scopeType}:${candidate.name}`)
    ) {
      continue;
    }

    filtered.push({
      majorCategory,
      name: candidate.name,
      scopeType: candidate.scopeType,
    });
    seen.add(`${candidate.scopeType}:${candidate.name}`);
  }

  return filtered;
}

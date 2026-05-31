import OpenAI from "openai";
import { z } from "zod";

import type { AppConfig } from "@/config/schema";
import type { ScopeParseResult } from "@/quiz/scope-match";

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

  return parseOpenAIOutput(response.output_text);
}

function parseOpenAIOutput(outputText: string): ScopeParseResult {
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

  return result.data;
}

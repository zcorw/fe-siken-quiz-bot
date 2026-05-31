/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import type { AppConfig } from "@/config/schema";
import {
  createOpenAIScopeClient,
  parseScope,
  parseScopeWithOpenAI,
} from "./scope-parser";

const aiConfig: AppConfig["ai"] = {
  provider: "openai",
  model: "gpt-4.1-mini",
  temperature: 0,
  max_suggestions: 3,
};

const availableScope = {
  standardTopics: ["データベース", "ネットワーク"],
  categories: ["テクノロジ系"],
  topics: ["データベース", "ネットワーク"],
};

describe("parseScopeWithOpenAI", () => {
  it("calls OpenAI Responses API with structured JSON output and parses the result", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        matchedTopics: ["データベース"],
        matchedCategories: [],
        suggestions: [],
        method: "openai",
        status: "matched",
      }),
    });

    const result = await parseScopeWithOpenAI({
      client: { responses: { create } },
      input: "数据库の問題",
      aiConfig,
      availableScope,
    });

    expect(result).toEqual({
      matchedTopics: ["データベース"],
      matchedCategories: [],
      suggestions: [],
      method: "openai",
      status: "matched",
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-4.1-mini",
        temperature: 0,
        text: expect.objectContaining({
          format: expect.objectContaining({
            type: "json_schema",
            name: "scope_parse_result",
            strict: true,
          }),
        }),
      })
    );
  });

  it("rejects malformed OpenAI JSON", async () => {
    await expect(
      parseScopeWithOpenAI({
        client: {
          responses: {
            create: vi.fn().mockResolvedValue({ output_text: "{bad json" }),
          },
        },
        input: "database",
        aiConfig,
        availableScope,
      })
    ).rejects.toThrow("Invalid OpenAI scope parse JSON");
  });

  it("does not allow OpenAI to return topics outside the available scope", async () => {
    const result = await parseScopeWithOpenAI({
      client: {
        responses: {
          create: vi.fn().mockResolvedValue({
            output_text: JSON.stringify({
              matchedTopics: ["存在しないテーマ"],
              matchedCategories: [],
              suggestions: ["ネットワーク"],
              method: "openai",
              status: "matched",
            }),
          }),
        },
      },
      input: "unknown",
      aiConfig,
      availableScope,
    });

    expect(result).toEqual({
      matchedTopics: [],
      matchedCategories: [],
      suggestions: ["ネットワーク"],
      method: "openai",
      status: "no_match",
    });
  });

  it("instructs OpenAI not to generate questions, rewrite content, answer, or explain", async () => {
    const create = vi.fn().mockResolvedValue({
      output_text: JSON.stringify({
        matchedTopics: [],
        matchedCategories: [],
        suggestions: [],
        method: "openai",
        status: "no_match",
      }),
    });

    await parseScopeWithOpenAI({
      client: { responses: { create } },
      input: "問題を作って",
      aiConfig,
      availableScope,
    });

    const userMessage = create.mock.calls[0]?.[0].input[1].content;
    expect(userMessage).toContain("Do not create questions.");
    expect(userMessage).toContain("Do not rewrite question text.");
    expect(userMessage).toContain("Do not answer or explain exam questions.");
  });
});

describe("parseScope", () => {
  it("returns local matches without calling OpenAI", async () => {
    const create = vi.fn();

    const result = await parseScope({
      input: "DB",
      topicsConfig: {
        standard_topics: ["データベース"],
        high_weight_topics: ["データベース"],
        aliases: { データベース: ["DB"] },
        standard_topic_mappings: {},
      },
      questionBankKeywords: { categories: [], topics: ["データベース"] },
      aiConfig,
      availableScope,
      client: { responses: { create } },
    });

    expect(result.status).toBe("matched");
    expect(result.method).toBe("alias");
    expect(create).not.toHaveBeenCalled();
  });

  it("returns ai_unavailable when local matching fails and OpenAI fallback rejects", async () => {
    const result = await parseScope({
      input: "unknown",
      topicsConfig: {
        standard_topics: ["データベース"],
        high_weight_topics: ["データベース"],
        aliases: { データベース: ["DB"] },
        standard_topic_mappings: {},
      },
      questionBankKeywords: { categories: [], topics: ["データベース"] },
      aiConfig,
      availableScope,
      client: {
        responses: {
          create: vi.fn().mockRejectedValue(new Error("network down")),
        },
      },
    });

    expect(result).toEqual({
      matchedCategories: [],
      matchedTopics: [],
      method: "openai_unavailable",
      status: "ai_unavailable",
      suggestions: [],
    });
  });
});

describe("createOpenAIScopeClient", () => {
  it("creates an official OpenAI SDK client from an API key", () => {
    expect(createOpenAIScopeClient("test-key")).toHaveProperty("responses");
  });
});

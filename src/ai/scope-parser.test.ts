/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

import type { AppConfig } from "@/config/schema";
import { createOpenAIScopeClient, parseScopeWithOpenAI } from "./scope-parser";

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
});

describe("createOpenAIScopeClient", () => {
  it("creates an official OpenAI SDK client from an API key", () => {
    expect(createOpenAIScopeClient("test-key")).toHaveProperty("responses");
  });
});

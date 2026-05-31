import { describe, expect, it } from "vitest";

import type { AppConfig } from "@/config/schema";
import {
  matchQuestionBankKeywords,
  matchTopicAlias,
  normalizeScopeText,
  parseLocalScope,
  suggestSimilarScopeTerms,
} from "./scope-match";

const topicsConfig: AppConfig["topics"] = {
  standard_topics: ["データベース", "ネットワーク", "情報セキュリティ"],
  high_weight_topics: ["情報セキュリティ"],
  aliases: {
    データベース: ["DB", "数据库"],
    ネットワーク: ["网络", "通信ネットワーク"],
    情報セキュリティ: ["セキュリティ", "信息安全"],
  },
  standard_topic_mappings: {},
};

describe("normalizeScopeText", () => {
  it("normalizes width, case, and whitespace for scope matching", () => {
    expect(normalizeScopeText(" Ｄ Ｂ ")).toBe("db");
    expect(normalizeScopeText("通信　ネットワーク")).toBe("通信ネットワーク");
  });
});

describe("matchTopicAlias", () => {
  it("matches standard topics directly", () => {
    expect(matchTopicAlias("データベース", topicsConfig)).toEqual([
      "データベース",
    ]);
  });

  it("matches configured aliases after normalization", () => {
    expect(matchTopicAlias(" ｄ ｂ ", topicsConfig)).toEqual(["データベース"]);
    expect(matchTopicAlias("信息安全", topicsConfig)).toEqual([
      "情報セキュリティ",
    ]);
  });

  it("returns an empty list when no alias matches", () => {
    expect(matchTopicAlias("プロジェクト", topicsConfig)).toEqual([]);
  });
});

describe("matchQuestionBankKeywords", () => {
  const questionBankKeywords = {
    categories: ["テクノロジ系", "マネジメント系"],
    topics: ["ネットワーク", "データベース", "プロジェクトマネジメント"],
  };

  it("matches normalized question category keywords", () => {
    expect(
      matchQuestionBankKeywords(" テクノロジ 系 ", questionBankKeywords)
    ).toEqual({
      matchedCategories: ["テクノロジ系"],
      matchedTopics: [],
    });
  });

  it("matches question topic keywords contained in natural text", () => {
    expect(
      matchQuestionBankKeywords(
        "ネットワークを練習したい",
        questionBankKeywords
      )
    ).toEqual({
      matchedCategories: [],
      matchedTopics: ["ネットワーク"],
    });
  });

  it("returns empty category and topic lists when no keyword matches", () => {
    expect(matchQuestionBankKeywords("法務", questionBankKeywords)).toEqual({
      matchedCategories: [],
      matchedTopics: [],
    });
  });
});

describe("parseLocalScope", () => {
  const questionBankKeywords = {
    categories: ["テクノロジ系", "マネジメント系"],
    topics: ["ネットワーク", "データベース", "プロジェクトマネジメント"],
  };

  it("returns a matched alias parse result before question bank keywords", () => {
    expect(parseLocalScope("DB", topicsConfig, questionBankKeywords)).toEqual({
      matchedCategories: [],
      matchedTopics: ["データベース"],
      method: "alias",
      status: "matched",
      suggestions: [],
    });
  });

  it("returns a question bank keyword parse result when aliases do not match", () => {
    expect(
      parseLocalScope(
        "プロジェクトマネジメント",
        topicsConfig,
        questionBankKeywords
      )
    ).toEqual({
      matchedCategories: [],
      matchedTopics: ["プロジェクトマネジメント"],
      method: "question_bank_keyword",
      status: "matched",
      suggestions: [],
    });
  });

  it("returns no_match with the complete result shape when local matching fails", () => {
    expect(parseLocalScope("法務", topicsConfig, questionBankKeywords)).toEqual(
      {
        matchedCategories: [],
        matchedTopics: [],
        method: "none",
        status: "no_match",
        suggestions: [],
      }
    );
  });

  it("returns similar suggestions when local matching fails", () => {
    expect(
      parseLocalScope("データベス", topicsConfig, questionBankKeywords, 3)
    ).toEqual({
      matchedCategories: [],
      matchedTopics: [],
      method: "none",
      status: "no_match",
      suggestions: ["データベース"],
    });
  });
});

describe("suggestSimilarScopeTerms", () => {
  it("returns up to the requested number of unique similar scope suggestions", () => {
    expect(
      suggestSimilarScopeTerms(
        "ネットワク",
        topicsConfig,
        {
          categories: ["テクノロジ系"],
          topics: ["ネットワーク", "データベース"],
        },
        2
      )
    ).toEqual(["ネットワーク"]);
  });
});

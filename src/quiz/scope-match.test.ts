import { describe, expect, it } from "vitest";

import type { AppConfig } from "@/config/schema";
import {
  matchQuestionBankKeywords,
  matchTopicAlias,
  normalizeScopeText,
  parseLocalScope,
  resolveNoMatchAction,
  suggestSimilarScopeTerms,
} from "./scope-match";

const topicsConfig: AppConfig["topics"] = {
  category_tree: {
    データベース: ["データ操作"],
    ネットワーク: ["通信プロトコル"],
    通信プロトコル: ["プロトコル設計"],
    情報セキュリティ: ["情報セキュリティ"],
  },
  high_weight_topics: ["情報セキュリティ"],
  aliases: {
    データベース: ["DB", "数据库"],
    ネットワーク: ["网络", "通信ネットワーク"],
    通信プロトコル: [],
    情報セキュリティ: ["セキュリティ", "信息安全"],
  },
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

  it("returns a major category result for direct major category input", () => {
    expect(
      parseLocalScope("ネットワーク", topicsConfig, questionBankKeywords)
    ).toEqual({
      candidateMinorCategories: ["通信プロトコル"],
      majorCategory: "ネットワーク",
      matchedCategories: [],
      matchedTopics: [],
      method: "local_exact",
      minorCategory: undefined,
      scopeType: "major_category",
      status: "matched",
      suggestions: [],
    });
  });

  it("returns a minor category result for direct minor category input", () => {
    expect(
      parseLocalScope("通信プロトコル", topicsConfig, questionBankKeywords)
    ).toEqual({
      candidateMinorCategories: ["通信プロトコル"],
      majorCategory: "ネットワーク",
      matchedCategories: ["通信プロトコル"],
      matchedTopics: [],
      method: "local_exact",
      minorCategory: "通信プロトコル",
      scopeType: "minor_category",
      status: "matched",
      suggestions: [],
    });
  });

  it("prioritizes an exact minor category over an exact major category with the same name", () => {
    expect(
      parseLocalScope("通信プロトコル", topicsConfig, questionBankKeywords)
    ).toMatchObject({
      candidateMinorCategories: ["通信プロトコル"],
      majorCategory: "ネットワーク",
      matchedCategories: ["通信プロトコル"],
      method: "local_exact",
      minorCategory: "通信プロトコル",
      scopeType: "minor_category",
      status: "matched",
    });
  });

  it("returns a major category result for alias input", () => {
    expect(parseLocalScope("网络", topicsConfig, questionBankKeywords)).toEqual({
      candidateMinorCategories: ["通信プロトコル"],
      majorCategory: "ネットワーク",
      matchedCategories: [],
      matchedTopics: [],
      method: "local_alias",
      minorCategory: undefined,
      scopeType: "major_category",
      status: "matched",
      suggestions: [],
    });
  });

  it("does not treat a single alias phrase containing its major category as multiple scopes", () => {
    expect(
      parseLocalScope(
        "通信ネットワークを練習したい",
        topicsConfig,
        questionBankKeywords,
        3
      )
    ).toMatchObject({
      method: "local_fuzzy",
      scopeType: "no_match",
      status: "no_match",
      suggestions: ["ネットワーク"],
    });
  });

  it("returns a single-scope retry result when multiple configured scopes are present", () => {
    expect(
      parseLocalScope(
        "ネットワークとデータベース",
        topicsConfig,
        questionBankKeywords
      )
    ).toEqual({
      candidateMinorCategories: [],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "local_multi_scope",
      minorCategory: undefined,
      scopeType: "no_match",
      status: "needs_single_scope",
      suggestions: [],
    });
  });

  it("uses local Fuse suggestions instead of question topic matching when exact configured matching fails", () => {
    expect(
      parseLocalScope(
        "ネットワークを練習したい",
        topicsConfig,
        questionBankKeywords,
        3
      )
    ).toEqual({
      candidateMinorCategories: [],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "local_fuzzy",
      minorCategory: undefined,
      scopeType: "no_match",
      status: "no_match",
      suggestions: ["ネットワーク"],
    });
  });

  it("returns no_match with the complete result shape when local matching fails", () => {
    expect(parseLocalScope("法務", topicsConfig, questionBankKeywords)).toEqual(
      {
        candidateMinorCategories: [],
        majorCategory: undefined,
        matchedCategories: [],
        matchedTopics: [],
        method: "none",
        minorCategory: undefined,
        scopeType: "no_match",
        status: "no_match",
        suggestions: [],
      }
    );
  });

  it("returns similar suggestions when local matching fails", () => {
    expect(
      parseLocalScope("データベス", topicsConfig, questionBankKeywords, 1)
    ).toEqual({
      candidateMinorCategories: [],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "local_fuzzy",
      minorCategory: undefined,
      scopeType: "no_match",
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

describe("resolveNoMatchAction", () => {
  it("returns suggestions when a no_match result has suggestions", () => {
    expect(
      resolveNoMatchAction({
        candidateMinorCategories: [],
        majorCategory: undefined,
        matchedCategories: [],
        matchedTopics: [],
        method: "local_fuzzy",
        minorCategory: undefined,
        scopeType: "no_match",
        status: "no_match",
        suggestions: ["データベース", "ネットワーク"],
      })
    ).toEqual({
      type: "suggestions",
      suggestions: ["データベース", "ネットワーク"],
    });
  });

  it("returns a single-scope retry prompt for multiple configured scopes", () => {
    expect(
      resolveNoMatchAction({
        candidateMinorCategories: [],
        majorCategory: undefined,
        matchedCategories: [],
        matchedTopics: [],
        method: "local_multi_scope",
        minorCategory: undefined,
        scopeType: "no_match",
        status: "needs_single_scope",
        suggestions: [],
      })
    ).toEqual({
      message: "練習範囲は1つだけ入力してください。",
      type: "retry_input",
    });
  });

  it("returns a retry input prompt when there are no suggestions", () => {
    expect(
      resolveNoMatchAction({
        candidateMinorCategories: [],
        majorCategory: undefined,
        matchedCategories: [],
        matchedTopics: [],
        method: "none",
        minorCategory: undefined,
        scopeType: "no_match",
        status: "no_match",
        suggestions: [],
      })
    ).toEqual({
      message: "練習したい分野を入力し直してください。",
      type: "retry_input",
    });
  });
});

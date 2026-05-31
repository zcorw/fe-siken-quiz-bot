import { describe, expect, it } from "vitest";

import type { AppConfig } from "@/config/schema";
import { matchTopicAlias, normalizeScopeText } from "./scope-match";

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

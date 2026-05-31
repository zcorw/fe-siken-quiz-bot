import type { AppConfig } from "@/config/schema";

export function normalizeScopeText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, "");
}

export function matchTopicAlias(
  input: string,
  topicsConfig: AppConfig["topics"]
): string[] {
  const normalizedInput = normalizeScopeText(input);
  const matches = new Set<string>();

  for (const standardTopic of topicsConfig.standard_topics) {
    if (normalizeScopeText(standardTopic) === normalizedInput) {
      matches.add(standardTopic);
    }
  }

  for (const [standardTopic, aliases] of Object.entries(topicsConfig.aliases)) {
    for (const alias of aliases) {
      if (normalizeScopeText(alias) === normalizedInput) {
        matches.add(standardTopic);
      }
    }
  }

  return Array.from(matches);
}

export interface QuestionBankKeywordIndex {
  categories: string[];
  topics: string[];
}

export interface QuestionBankKeywordMatch {
  matchedCategories: string[];
  matchedTopics: string[];
}

export type ScopeParseMethod = "alias" | "question_bank_keyword" | "none";
export type ScopeParseStatus = "matched" | "no_match";

export interface ScopeParseResult {
  matchedTopics: string[];
  matchedCategories: string[];
  suggestions: string[];
  method: ScopeParseMethod;
  status: ScopeParseStatus;
}

export function matchQuestionBankKeywords(
  input: string,
  keywords: QuestionBankKeywordIndex
): QuestionBankKeywordMatch {
  const normalizedInput = normalizeScopeText(input);

  return {
    matchedCategories: matchKeywords(normalizedInput, keywords.categories),
    matchedTopics: matchKeywords(normalizedInput, keywords.topics),
  };
}

export function parseLocalScope(
  input: string,
  topicsConfig: AppConfig["topics"],
  keywords: QuestionBankKeywordIndex
): ScopeParseResult {
  const matchedAliasTopics = matchTopicAlias(input, topicsConfig);

  if (matchedAliasTopics.length > 0) {
    return {
      matchedCategories: [],
      matchedTopics: matchedAliasTopics,
      method: "alias",
      status: "matched",
      suggestions: [],
    };
  }

  const keywordMatch = matchQuestionBankKeywords(input, keywords);

  if (
    keywordMatch.matchedCategories.length > 0 ||
    keywordMatch.matchedTopics.length > 0
  ) {
    return {
      ...keywordMatch,
      method: "question_bank_keyword",
      status: "matched",
      suggestions: [],
    };
  }

  return {
    matchedCategories: [],
    matchedTopics: [],
    method: "none",
    status: "no_match",
    suggestions: [],
  };
}

function matchKeywords(normalizedInput: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => {
    const normalizedKeyword = normalizeScopeText(keyword);
    return (
      normalizedInput === normalizedKeyword ||
      normalizedInput.includes(normalizedKeyword)
    );
  });
}

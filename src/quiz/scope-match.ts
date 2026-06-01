import Fuse from "fuse.js";

import {
  getMajorCategories,
  getMinorToMajorCategoryMap,
  type AppConfig,
} from "@/config/schema";

export function normalizeScopeText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ja-JP").replace(/\s+/g, "");
}

export function matchTopicAlias(
  input: string,
  topicsConfig: AppConfig["topics"]
): string[] {
  const normalizedInput = normalizeScopeText(input);
  const matches = new Set<string>();

  for (const standardTopic of getMajorCategories(topicsConfig)) {
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

export type ScopeParseMethod =
  | "local_exact"
  | "local_alias"
  | "local_fuzzy"
  | "local_multi_scope"
  | "alias"
  | "question_bank_keyword"
  | "openai"
  | "openai_unavailable"
  | "none";
export type ScopeParseStatus =
  | "matched"
  | "no_match"
  | "needs_single_scope"
  | "ai_unavailable";
export type ScopeType =
  | "major_category"
  | "minor_category"
  | "topic_keyword"
  | "category_keyword"
  | "no_match"
  | "ai_unavailable";

export interface ScopeParseResult {
  scopeType: ScopeType;
  majorCategory?: string;
  minorCategory?: string;
  candidateMinorCategories: string[];
  matchedTopics: string[];
  matchedCategories: string[];
  suggestions: string[];
  method: ScopeParseMethod;
  status: ScopeParseStatus;
}

export type ScopeNoMatchAction =
  | { type: "suggestions"; suggestions: string[] }
  | { type: "retry_input"; message: string };

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
  keywords: QuestionBankKeywordIndex,
  maxSuggestions = 0
): ScopeParseResult {
  if (hasMultipleConfiguredScopes(input, topicsConfig)) {
    return {
      candidateMinorCategories: [],
      majorCategory: undefined,
      matchedCategories: [],
      matchedTopics: [],
      method: "local_multi_scope",
      minorCategory: undefined,
      scopeType: "no_match",
      status: "needs_single_scope",
      suggestions: [],
    };
  }

  const exactCategoryMatch = matchConfiguredCategory(input, topicsConfig);

  if (exactCategoryMatch !== undefined) {
    return exactCategoryMatch;
  }

  const matchedAliasTopics = matchTopicAlias(input, topicsConfig);

  if (matchedAliasTopics.length > 0) {
    const majorCategory = matchedAliasTopics[0];
    return {
      candidateMinorCategories: topicsConfig.category_tree[majorCategory] ?? [],
      majorCategory,
      matchedCategories: [],
      matchedTopics: [],
      method: "local_alias",
      minorCategory: undefined,
      scopeType: "major_category",
      status: "matched",
      suggestions: [],
    };
  }

  const suggestions =
    maxSuggestions > 0
      ? suggestSimilarScopeTerms(input, topicsConfig, keywords, maxSuggestions)
      : [];

  const method: ScopeParseMethod =
    maxSuggestions > 0 && suggestions.length > 0 ? "local_fuzzy" : "none";

  return {
    candidateMinorCategories: [],
    majorCategory: undefined,
    matchedCategories: [],
    matchedTopics: [],
    method,
    minorCategory: undefined,
    scopeType: "no_match",
    status: "no_match",
    suggestions,
  };
}

function hasMultipleConfiguredScopes(
  input: string,
  topicsConfig: AppConfig["topics"]
): boolean {
  const normalizedInput = normalizeScopeText(input);
  const normalizedScopeNames = new Map<string, string>();

  for (const [minorCategory] of getMinorToMajorCategoryMap(topicsConfig)) {
    normalizedScopeNames.set(
      normalizeScopeText(minorCategory),
      `minor:${minorCategory}`
    );
  }

  for (const majorCategory of getMajorCategories(topicsConfig)) {
    const normalizedMajorCategory = normalizeScopeText(majorCategory);
    if (!normalizedScopeNames.has(normalizedMajorCategory)) {
      normalizedScopeNames.set(normalizedMajorCategory, `major:${majorCategory}`);
    }
  }

  for (const [majorCategory, aliases] of Object.entries(topicsConfig.aliases)) {
    for (const alias of aliases) {
      normalizedScopeNames.set(
        normalizeScopeText(alias),
        `major:${majorCategory}`
      );
    }
  }

  const containedScopes = new Set<string>();

  for (const [normalizedScopeName, canonicalScope] of normalizedScopeNames) {
    if (
      normalizedInput !== normalizedScopeName &&
      normalizedInput.includes(normalizedScopeName)
    ) {
      containedScopes.add(canonicalScope);
    }
  }

  return containedScopes.size > 1;
}

function matchConfiguredCategory(
  input: string,
  topicsConfig: AppConfig["topics"]
): ScopeParseResult | undefined {
  const normalizedInput = normalizeScopeText(input);
  const minorToMajorCategory = getMinorToMajorCategoryMap(topicsConfig);

  for (const [minorCategory, majorCategory] of minorToMajorCategory) {
    if (normalizeScopeText(minorCategory) === normalizedInput) {
      return {
        candidateMinorCategories: [minorCategory],
        majorCategory,
        matchedCategories: [minorCategory],
        matchedTopics: [],
        method: "local_exact",
        minorCategory,
        scopeType: "minor_category",
        status: "matched",
        suggestions: [],
      };
    }
  }

  for (const majorCategory of getMajorCategories(topicsConfig)) {
    if (normalizeScopeText(majorCategory) === normalizedInput) {
      return {
        candidateMinorCategories: topicsConfig.category_tree[majorCategory],
        majorCategory,
        matchedCategories: [],
        matchedTopics: [],
        method: "local_exact",
        minorCategory: undefined,
        scopeType: "major_category",
        status: "matched",
        suggestions: [],
      };
    }
  }

  return undefined;
}

export function suggestSimilarScopeTerms(
  input: string,
  topicsConfig: AppConfig["topics"],
  keywords: QuestionBankKeywordIndex,
  maxSuggestions: number
): string[] {
  void keywords;

  const candidates = buildSuggestionCandidates(topicsConfig);
  const normalizedInput = normalizeScopeText(input);
  const fuse = new Fuse(candidates, {
    keys: ["normalizedText"],
    threshold: 0.45,
    ignoreLocation: true,
  });
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (
      normalizedInput !== candidate.normalizedText &&
      normalizedInput.includes(candidate.normalizedText) &&
      !seen.has(candidate.suggestion)
    ) {
      suggestions.push(candidate.suggestion);
      seen.add(candidate.suggestion);
    }

    if (suggestions.length >= maxSuggestions) {
      return suggestions;
    }
  }

  for (const result of fuse.search(normalizedInput)) {
    const suggestion = result.item.suggestion;
    if (!seen.has(suggestion)) {
      suggestions.push(suggestion);
      seen.add(suggestion);
    }

    if (suggestions.length >= maxSuggestions) {
      break;
    }
  }

  return suggestions;
}

export function resolveNoMatchAction(
  result: ScopeParseResult
): ScopeNoMatchAction {
  if (result.status === "needs_single_scope") {
    return {
      message: "練習範囲は1つだけ入力してください。",
      type: "retry_input",
    };
  }

  if (result.suggestions.length > 0) {
    return {
      type: "suggestions",
      suggestions: result.suggestions,
    };
  }

  return {
    message: "練習したい分野を入力し直してください。",
    type: "retry_input",
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

interface SuggestionCandidate {
  normalizedText: string;
  suggestion: string;
}

function buildSuggestionCandidates(
  topicsConfig: AppConfig["topics"]
): SuggestionCandidate[] {
  const candidates: SuggestionCandidate[] = [];

  for (const topic of getMajorCategories(topicsConfig)) {
    candidates.push({
      normalizedText: normalizeScopeText(topic),
      suggestion: topic,
    });
  }

  for (const [minorCategory] of getMinorToMajorCategoryMap(topicsConfig)) {
    candidates.push({
      normalizedText: normalizeScopeText(minorCategory),
      suggestion: minorCategory,
    });
  }

  for (const [standardTopic, aliases] of Object.entries(topicsConfig.aliases)) {
    for (const alias of aliases) {
      candidates.push({
        normalizedText: normalizeScopeText(alias),
        suggestion: standardTopic,
      });
    }
  }

  return candidates;
}

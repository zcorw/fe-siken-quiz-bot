import Fuse from "fuse.js";

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

export type ScopeParseMethod =
  | "alias"
  | "question_bank_keyword"
  | "openai"
  | "none";
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
  keywords: QuestionBankKeywordIndex,
  maxSuggestions = 0
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
    suggestions:
      maxSuggestions > 0
        ? suggestSimilarScopeTerms(
            input,
            topicsConfig,
            keywords,
            maxSuggestions
          )
        : [],
  };
}

export function suggestSimilarScopeTerms(
  input: string,
  topicsConfig: AppConfig["topics"],
  keywords: QuestionBankKeywordIndex,
  maxSuggestions: number
): string[] {
  const candidates = buildSuggestionCandidates(topicsConfig, keywords);
  const fuse = new Fuse(candidates, {
    keys: ["normalizedText"],
    threshold: 0.45,
    ignoreLocation: true,
  });
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const result of fuse.search(normalizeScopeText(input))) {
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
  topicsConfig: AppConfig["topics"],
  keywords: QuestionBankKeywordIndex
): SuggestionCandidate[] {
  const candidates: SuggestionCandidate[] = [];

  for (const topic of topicsConfig.standard_topics) {
    candidates.push({
      normalizedText: normalizeScopeText(topic),
      suggestion: topic,
    });
  }

  for (const category of keywords.categories) {
    candidates.push({
      normalizedText: normalizeScopeText(category),
      suggestion: category,
    });
  }

  for (const topic of keywords.topics) {
    candidates.push({
      normalizedText: normalizeScopeText(topic),
      suggestion: topic,
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

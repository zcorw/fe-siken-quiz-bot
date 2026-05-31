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

function matchKeywords(normalizedInput: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => {
    const normalizedKeyword = normalizeScopeText(keyword);
    return (
      normalizedInput === normalizedKeyword ||
      normalizedInput.includes(normalizedKeyword)
    );
  });
}

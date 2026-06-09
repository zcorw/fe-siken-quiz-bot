import type Database from "better-sqlite3";

import type {
  DetailOptions,
  QuestionBankProvider,
} from "./provider";
import {
  findQuestionCandidates,
  getQuestionDetail,
  listQuestionBankKeywords,
  type QuestionBankKeywords,
  type QuestionCandidateFilters,
  type QuestionCandidateRow,
  type QuestionDetail,
} from "./queries";

interface SqliteQuestionBankProviderOptions {
  db: Database.Database;
}

export class SqliteQuestionBankProvider implements QuestionBankProvider {
  private readonly db: Database.Database;

  constructor(options: SqliteQuestionBankProviderOptions) {
    this.db = options.db;
  }

  async listKeywords(): Promise<QuestionBankKeywords> {
    return listQuestionBankKeywords(this.db);
  }

  async findCandidates(
    filters: QuestionCandidateFilters = {}
  ): Promise<QuestionCandidateRow[]> {
    return findQuestionCandidates(this.db, filters);
  }

  async getDetailByUrl(
    url: string,
    options: DetailOptions = {}
  ): Promise<QuestionDetail | null> {
    const detail = getQuestionDetail(this.db, url);
    return detail === null ? null : applyDetailOptions(detail, options);
  }

  async getDetailsByUrls(
    urls: string[],
    options: DetailOptions = {}
  ): Promise<QuestionDetail[]> {
    return urls.flatMap((url) => {
      const detail = getQuestionDetail(this.db, url);
      return detail === null ? [] : [applyDetailOptions(detail, options)];
    });
  }
}

function applyDetailOptions(
  detail: QuestionDetail,
  options: DetailOptions
): QuestionDetail {
  return {
    ...detail,
    answer: options.includeAnswer ? detail.answer : null,
    explanation: options.includeExplanation ? detail.explanation : null,
  };
}

import type {
  QuestionBankKeywords,
  QuestionCandidateFilters,
  QuestionCandidateRow,
  QuestionDetail,
} from "./queries";

export interface DetailOptions {
  includeAnswer?: boolean;
  includeExplanation?: boolean;
}

export interface QuestionBankProvider {
  close?(): void;
  listKeywords(): Promise<QuestionBankKeywords>;
  findCandidates(filters?: QuestionCandidateFilters): Promise<QuestionCandidateRow[]>;
  getDetailByUrl(url: string, options?: DetailOptions): Promise<QuestionDetail | null>;
  getDetailsByUrls(urls: string[], options?: DetailOptions): Promise<QuestionDetail[]>;
}

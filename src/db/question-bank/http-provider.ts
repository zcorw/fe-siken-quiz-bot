import type {
  DetailOptions,
  QuestionBankProvider,
} from "./provider";
import type {
  QuestionBankKeywords,
  QuestionCandidateFilters,
  QuestionCandidateRow,
  QuestionDetail,
} from "./queries";

interface HttpQuestionBankProviderOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

interface RuntimeCandidate {
  questionId: number;
  sourcePageLabel: string | null;
  sourcePageUrl: string | null;
  examPart: "科目A";
  questionNo: string | null;
  topic: string | null;
  category: string | null;
  questionUrl: string;
  scrapedAt: string | null;
}

interface RuntimeBatchDetails {
  items: RuntimeDetail[];
}

interface RuntimeDetail {
  questionUrl: string;
  sourceUrl: string;
  questionText: string | null;
  choices: QuestionDetail["choices"];
  answer?: string | null;
  explanation?: string | null;
  hasImages: boolean;
  images: QuestionDetail["images"];
  fetchedAt: string | null;
}

export class HttpQuestionBankProvider implements QuestionBankProvider {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpQuestionBankProviderOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async listKeywords(): Promise<QuestionBankKeywords> {
    return this.getJson<QuestionBankKeywords>("/keywords");
  }

  async findCandidates(
    filters: QuestionCandidateFilters = {}
  ): Promise<QuestionCandidateRow[]> {
    const url = new URL(`${this.baseUrl}/questions/candidates`);
    appendOptional(url, "category", filters.category);
    appendOptional(url, "topic", filters.topic);
    appendOptional(url, "url", filters.url);
    const candidates = await this.fetchJson<RuntimeCandidate[]>(url);
    return candidates.map(mapCandidate);
  }

  async getDetailByUrl(
    url: string,
    options: DetailOptions = {}
  ): Promise<QuestionDetail | null> {
    const requestUrl = new URL(`${this.baseUrl}/questions/by-url`);
    requestUrl.searchParams.set("url", url);
    appendDetailOptions(requestUrl, options);
    const response = await this.fetchImpl(requestUrl);
    if (response.status === 404) {
      return null;
    }
    return mapDetail(await parseJsonResponse<RuntimeDetail>(response));
  }

  async getDetailsByUrls(
    urls: string[],
    options: DetailOptions = {}
  ): Promise<QuestionDetail[]> {
    const response = await this.postJson<RuntimeBatchDetails>("/questions/details/batch", {
      urls,
      includeAnswer: options.includeAnswer ?? false,
      includeExplanation: options.includeExplanation ?? options.includeAnswer ?? false,
    });
    return response.items.map(mapDetail);
  }

  private async getJson<T>(path: string): Promise<T> {
    return this.fetchJson<T>(new URL(`${this.baseUrl}${path}`));
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    return parseJsonResponse<T>(
      await this.fetchImpl(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
    );
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    return parseJsonResponse<T>(await this.fetchImpl(url));
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Question bank request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

function appendOptional(url: URL, name: string, value: string | undefined): void {
  if (value !== undefined) {
    url.searchParams.set(name, value);
  }
}

function appendDetailOptions(url: URL, options: DetailOptions): void {
  if (options.includeAnswer !== undefined) {
    url.searchParams.set("includeAnswer", String(options.includeAnswer));
  }
  if (options.includeExplanation !== undefined) {
    url.searchParams.set("includeExplanation", String(options.includeExplanation));
  }
}

function mapCandidate(candidate: RuntimeCandidate): QuestionCandidateRow {
  return {
    id: candidate.questionId,
    sourcePageLabel: candidate.sourcePageLabel,
    sourcePageUrl: candidate.sourcePageUrl,
    examPart: candidate.examPart,
    questionNo: candidate.questionNo,
    topic: candidate.topic,
    category: candidate.category,
    url: candidate.questionUrl,
    scrapedAt: candidate.scrapedAt,
  };
}

function mapDetail(detail: RuntimeDetail): QuestionDetail {
  return {
    questionUrl: detail.questionUrl,
    sourceUrl: detail.sourceUrl,
    questionText: detail.questionText,
    choices: detail.choices,
    answer: detail.answer ?? null,
    explanation: detail.explanation ?? null,
    hasImages: detail.hasImages,
    images: detail.images,
    fetchedAt: detail.fetchedAt,
  };
}

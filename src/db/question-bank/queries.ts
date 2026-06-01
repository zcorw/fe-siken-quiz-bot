import type Database from "better-sqlite3";

const EXAM_PART_SUBJECT_A = "科目A";

export interface QuestionCandidateRow {
  id: number;
  sourcePageLabel: string | null;
  sourcePageUrl: string | null;
  examPart: "科目A";
  questionNo: string | null;
  topic: string | null;
  category: string | null;
  url: string;
  scrapedAt: string | null;
}

export interface QuestionCandidateFilters {
  category?: string;
  categories?: string[];
  topic?: string;
  url?: string;
}

export interface QuestionBankKeywords {
  categories: string[];
  topics: string[];
}

export interface QuestionChoice {
  label: string;
  text: string;
}

export interface QuestionImageReference {
  section?: string | null;
  choiceLabel?: string | null;
  url?: string | null;
  localPath?: string | null;
  publicPath?: string | null;
  alt?: string | null;
  width?: string | null;
  height?: string | null;
  orderIndex?: number | null;
}

export interface QuestionDetail {
  questionUrl: string;
  sourceUrl: string;
  questionText: string | null;
  choices: QuestionChoice[];
  answer: string | null;
  explanation: string | null;
  hasImages: boolean;
  images: QuestionImageReference[];
  fetchedAt: string | null;
}

interface QuestionCandidateDbRow {
  id: number;
  source_page_label: string | null;
  source_page_url: string | null;
  exam_part: "科目A";
  question_no: string | null;
  topic: string | null;
  category: string | null;
  url: string;
  scraped_at: string | null;
}

interface QuestionDetailDbRow {
  question_url: string;
  question_text: string | null;
  choices_json: string | null;
  answer: string | null;
  explanation: string | null;
  images_json: string | null;
  has_images: number | null;
  fetched_at: string | null;
}

export function findQuestionCandidates(
  db: Database.Database,
  filters: QuestionCandidateFilters = {}
): QuestionCandidateRow[] {
  if (filters.categories !== undefined && filters.categories.length === 0) {
    return [];
  }

  const whereClauses = ["exam_part = ?"];
  const parameters: string[] = [EXAM_PART_SUBJECT_A];

  if (filters.category !== undefined) {
    whereClauses.push("category = ?");
    parameters.push(filters.category);
  }

  if (filters.categories !== undefined) {
    whereClauses.push(
      `category IN (${filters.categories.map(() => "?").join(", ")})`
    );
    parameters.push(...filters.categories);
  }

  if (filters.topic !== undefined) {
    whereClauses.push("topic = ?");
    parameters.push(filters.topic);
  }

  if (filters.url !== undefined) {
    whereClauses.push("url = ?");
    parameters.push(filters.url);
  }

  const rows = db
    .prepare(
      `
        WITH filtered_questions AS (
          SELECT
            id,
            source_page_label,
            source_page_url,
            exam_part,
            question_no,
            topic,
            category,
            url,
            scraped_at
          FROM questions
          WHERE ${whereClauses.join(" AND ")}
        ),
        deduped_questions AS (
          SELECT
            *,
            ROW_NUMBER() OVER (PARTITION BY url ORDER BY id ASC) AS url_rank
          FROM filtered_questions
        )
        SELECT
          id,
          source_page_label,
          source_page_url,
          exam_part,
          question_no,
          topic,
          category,
          url,
          scraped_at
        FROM deduped_questions
        WHERE url_rank = 1
        ORDER BY id ASC
      `
    )
    .all(...parameters) as QuestionCandidateDbRow[];

  return rows.map((row) => ({
    id: row.id,
    sourcePageLabel: row.source_page_label,
    sourcePageUrl: row.source_page_url,
    examPart: row.exam_part,
    questionNo: row.question_no,
    topic: row.topic,
    category: row.category,
    url: row.url,
    scrapedAt: row.scraped_at,
  }));
}

export function listQuestionBankKeywords(
  db: Database.Database
): QuestionBankKeywords {
  return {
    categories: listDistinctQuestionColumn(db, "category"),
    topics: listDistinctQuestionColumn(db, "topic"),
  };
}

export function getQuestionDetail(
  db: Database.Database,
  questionUrl: string
): QuestionDetail | null {
  const row = db
    .prepare(
      `
        SELECT
          question_url,
          question_text,
          choices_json,
          answer,
          explanation,
          images_json,
          has_images,
          fetched_at
        FROM question_details
        WHERE question_url = ?
      `
    )
    .get(questionUrl) as QuestionDetailDbRow | undefined;

  if (row === undefined) {
    return null;
  }

  return {
    questionUrl: row.question_url,
    sourceUrl: row.question_url,
    questionText: row.question_text,
    choices: parseChoicesJson(row.choices_json, row.question_url),
    answer: row.answer,
    explanation: row.explanation,
    hasImages: row.has_images === 1,
    images: parseImagesJson(row.images_json, row.question_url),
    fetchedAt: row.fetched_at,
  };
}

function listDistinctQuestionColumn(
  db: Database.Database,
  columnName: "category" | "topic"
): string[] {
  const rows = db
    .prepare(
      `
        SELECT DISTINCT ${columnName} AS value
        FROM questions
        WHERE exam_part = ?
          AND ${columnName} IS NOT NULL
          AND trim(${columnName}) <> ''
        ORDER BY ${columnName} ASC
      `
    )
    .all(EXAM_PART_SUBJECT_A) as { value: string }[];

  return rows.map((row) => row.value);
}

function parseChoicesJson(
  choicesJson: string | null,
  questionUrl: string
): QuestionChoice[] {
  if (choicesJson === null || choicesJson.trim() === "") {
    return [];
  }

  const parsed = parseJson(choicesJson, "choices_json", questionUrl);

  if (!isRecord(parsed)) {
    throw new Error(
      `Invalid choices_json for question detail ${questionUrl}: expected JSON object`
    );
  }

  return Object.entries(parsed).map(([label, text]) => {
    if (typeof text !== "string") {
      throw new Error(
        `Invalid choices_json for question detail ${questionUrl}: expected string choice text`
      );
    }

    return { label, text };
  });
}

function parseImagesJson(
  imagesJson: string | null,
  questionUrl: string
): QuestionImageReference[] {
  if (imagesJson === null || imagesJson.trim() === "") {
    return [];
  }

  const parsed = parseJson(imagesJson, "images_json", questionUrl);

  if (!Array.isArray(parsed)) {
    throw new Error(
      `Invalid images_json for question detail ${questionUrl}: expected JSON array`
    );
  }

  return parsed.map((image) => parseImageReference(image, questionUrl));
}

function parseJson(
  json: string,
  columnName: "choices_json" | "images_json",
  questionUrl: string
): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    throw new Error(
      `Invalid ${columnName} for question detail ${questionUrl}`,
      { cause: error }
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseImageReference(
  image: unknown,
  questionUrl: string
): QuestionImageReference {
  if (!isRecord(image)) {
    throw new Error(
      `Invalid images_json for question detail ${questionUrl}: expected image object`
    );
  }

  return {
    section: optionalString(image.section, "section", questionUrl),
    choiceLabel: optionalString(image.choiceLabel, "choiceLabel", questionUrl),
    url: optionalString(image.url, "url", questionUrl),
    localPath: optionalString(image.localPath, "localPath", questionUrl),
    publicPath: optionalString(image.publicPath, "publicPath", questionUrl),
    alt: optionalString(image.alt, "alt", questionUrl),
    width: optionalString(image.width, "width", questionUrl),
    height: optionalString(image.height, "height", questionUrl),
    orderIndex: optionalNumber(image.orderIndex, "orderIndex", questionUrl),
  };
}

function optionalString(
  value: unknown,
  fieldName: string,
  questionUrl: string
): string | null | undefined {
  if (value === undefined || value === null || typeof value === "string") {
    return value;
  }

  throw new Error(
    `Invalid images_json for question detail ${questionUrl}: expected string ${fieldName}`
  );
}

function optionalNumber(
  value: unknown,
  fieldName: string,
  questionUrl: string
): number | null | undefined {
  if (value === undefined || value === null || typeof value === "number") {
    return value;
  }

  throw new Error(
    `Invalid images_json for question detail ${questionUrl}: expected numeric ${fieldName}`
  );
}

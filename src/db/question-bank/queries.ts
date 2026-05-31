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
  topic?: string;
  url?: string;
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

export function findQuestionCandidates(
  db: Database.Database,
  filters: QuestionCandidateFilters = {}
): QuestionCandidateRow[] {
  const whereClauses = ["exam_part = ?"];
  const parameters: string[] = [EXAM_PART_SUBJECT_A];

  if (filters.category !== undefined) {
    whereClauses.push("category = ?");
    parameters.push(filters.category);
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

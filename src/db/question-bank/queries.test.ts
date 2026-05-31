/**
 * @vitest-environment node
 */
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findQuestionCandidates } from "./queries";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-candidates-"));
  tempDirs.push(tempDir);
  return tempDir;
}

async function createQuestionBankFixture(): Promise<Database.Database> {
  const tempDir = await makeTempDir();
  const dbPath = path.join(tempDir, "questions.sqlite");
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE questions (
      id INTEGER PRIMARY KEY,
      source_page_label TEXT,
      source_page_url TEXT,
      exam_part TEXT,
      question_no TEXT,
      topic TEXT,
      category TEXT,
      url TEXT UNIQUE,
      scraped_at TEXT
    );

    INSERT INTO questions (
      id,
      source_page_label,
      source_page_url,
      exam_part,
      question_no,
      topic,
      category,
      url,
      scraped_at
    ) VALUES
      (3, '令和6年春', 'https://example.test/r6', '科目A', '問3', 'セキュリティ', 'テクノロジ系', 'https://example.test/r6/q3.html', '2026-01-01T00:00:00Z'),
      (1, '令和5年秋', 'https://example.test/r5', '科目A', '問1', 'ネットワーク', 'テクノロジ系', 'https://example.test/r5/q1.html', '2026-01-01T00:00:00Z'),
      (2, '令和5年秋', 'https://example.test/r5', '科目A', '問2', 'マネジメント', 'マネジメント系', 'https://example.test/r5/q2.html', '2026-01-01T00:00:00Z'),
      (4, '令和6年春', 'https://example.test/r6', '科目B', '問4', 'セキュリティ', 'テクノロジ系', 'https://example.test/r6/q4.html', '2026-01-01T00:00:00Z');
  `);

  return db;
}

describe("question candidate queries", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("returns 科目A question candidates ordered by id", async () => {
    const db = await createQuestionBankFixture();

    try {
      expect(findQuestionCandidates(db).map((row) => row.id)).toEqual([
        1, 2, 3,
      ]);
    } finally {
      db.close();
    }
  });

  it("filters candidates by exact category, topic, and url matches", async () => {
    const db = await createQuestionBankFixture();

    try {
      expect(
        findQuestionCandidates(db, { category: "テクノロジ系" }).map(
          (row) => row.id
        )
      ).toEqual([1, 3]);

      expect(
        findQuestionCandidates(db, { topic: "セキュリティ" }).map(
          (row) => row.id
        )
      ).toEqual([3]);

      expect(
        findQuestionCandidates(db, {
          url: "https://example.test/r5/q2.html",
        }).map((row) => row.id)
      ).toEqual([2]);
    } finally {
      db.close();
    }
  });

  it("combines candidate filters with AND", async () => {
    const db = await createQuestionBankFixture();

    try {
      expect(
        findQuestionCandidates(db, {
          category: "テクノロジ系",
          topic: "セキュリティ",
          url: "https://example.test/r6/q3.html",
        }).map((row) => row.id)
      ).toEqual([3]);

      expect(
        findQuestionCandidates(db, {
          category: "マネジメント系",
          topic: "セキュリティ",
        })
      ).toEqual([]);
    } finally {
      db.close();
    }
  });
});

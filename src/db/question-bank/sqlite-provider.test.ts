/**
 * @vitest-environment node
 */
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { SqliteQuestionBankProvider } from "./sqlite-provider";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-sqlite-provider-"));
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
      url TEXT,
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
      (1, 'R5', 'https://example.test/r5', '科目A', 'Q1', 'network', 'technology', 'https://example.test/r5/q1.html', '2026-01-01T00:00:00Z'),
      (2, 'R5', 'https://example.test/r5', '科目A', 'Q2', 'security', 'technology', 'https://example.test/r5/q2.html', '2026-01-01T00:00:00Z'),
      (3, 'R5', 'https://example.test/r5', '绉戠洰B', 'Q3', 'security', 'technology', 'https://example.test/r5/q3.html', '2026-01-01T00:00:00Z');
  `);

  db.exec(`
    CREATE TABLE question_details (
      question_url TEXT PRIMARY KEY,
      question_text TEXT,
      choices_json TEXT,
      answer TEXT,
      explanation TEXT,
      images_json TEXT,
      has_images INTEGER,
      fetched_at TEXT
    );

    INSERT INTO question_details (
      question_url,
      question_text,
      choices_json,
      answer,
      explanation,
      images_json,
      has_images,
      fetched_at
    ) VALUES
      (
        'https://example.test/r5/q1.html',
        'Question 1 text',
        '{"A":"Choice A","B":"Choice B"}',
        'B',
        'Explanation 1',
        '[]',
        0,
        '2026-01-02T00:00:00Z'
      ),
      (
        'https://example.test/r5/q2.html',
        'Question 2 text',
        '{"A":"Choice A","B":"Choice B"}',
        'A',
        'Explanation 2',
        '[]',
        0,
        '2026-01-02T00:00:00Z'
      );
  `);

  return db;
}

describe("SqliteQuestionBankProvider", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("delegates keyword and candidate reads to the existing SQLite queries", async () => {
    const db = await createQuestionBankFixture();
    const provider = new SqliteQuestionBankProvider({ db });

    try {
      await expect(provider.listKeywords()).resolves.toEqual({
        categories: ["technology"],
        topics: ["network", "security"],
      });
      await expect(
        provider.findCandidates({ topic: "security" })
      ).resolves.toMatchObject([
        {
          id: 2,
          questionNo: "Q2",
          topic: "security",
          category: "technology",
          url: "https://example.test/r5/q2.html",
        },
      ]);
    } finally {
      db.close();
    }
  });

  it("loads single and batch details while preserving requested URL order", async () => {
    const db = await createQuestionBankFixture();
    const provider = new SqliteQuestionBankProvider({ db });

    try {
      await expect(
        provider.getDetailByUrl("https://example.test/r5/q1.html", {
          includeAnswer: true,
          includeExplanation: true,
        })
      ).resolves.toMatchObject({
        questionUrl: "https://example.test/r5/q1.html",
        questionText: "Question 1 text",
        answer: "B",
        explanation: "Explanation 1",
      });

      await expect(
        provider.getDetailsByUrls(
          [
            "https://example.test/r5/q2.html",
            "https://example.test/missing.html",
            "https://example.test/r5/q1.html",
          ],
          { includeAnswer: false, includeExplanation: false }
        )
      ).resolves.toMatchObject([
        {
          questionUrl: "https://example.test/r5/q2.html",
          answer: null,
          explanation: null,
        },
        {
          questionUrl: "https://example.test/r5/q1.html",
          answer: null,
          explanation: null,
        },
      ]);
    } finally {
      db.close();
    }
  });
});

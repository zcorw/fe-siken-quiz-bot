/**
 * @vitest-environment node
 */
import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findQuestionCandidates, getQuestionDetail } from "./queries";

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

  db.exec(`
    CREATE TABLE question_details (
      question_url TEXT PRIMARY KEY,
      question_text TEXT,
      question_html TEXT,
      choices_json TEXT,
      choices_html_json TEXT,
      answer TEXT,
      explanation TEXT,
      explanation_html TEXT,
      images_json TEXT,
      has_images INTEGER,
      fetched_at TEXT
    );

    INSERT INTO question_details (
      question_url,
      question_text,
      question_html,
      choices_json,
      choices_html_json,
      answer,
      explanation,
      explanation_html,
      images_json,
      has_images,
      fetched_at
    ) VALUES (
      'https://example.test/r5/q1.html',
      'Question text\n![diagram](/assets/fe-siken/r5/q1/question.png)',
      '<p>Question text</p>',
      '{"A":"Choice A","B":"Choice B with ![choice](/assets/fe-siken/r5/q1/choice-b.png)","C":"Choice C","D":"Choice D"}',
      '{"A":"<p>Choice A</p>"}',
      'B',
      'Explanation with ![explanation](/assets/fe-siken/r5/q1/explanation.png)',
      '<p>Explanation</p>',
      '[{"section":"question","choiceLabel":null,"url":"https://example.test/question.png","localPath":"docs/assets/fe-siken/r5/q1/question.png","publicPath":"/assets/fe-siken/r5/q1/question.png","alt":"diagram","width":"640","height":"320","orderIndex":0},{"section":"choice","choiceLabel":"B","url":"https://example.test/choice-b.png","localPath":"docs/assets/fe-siken/r5/q1/choice-b.png","publicPath":"/assets/fe-siken/r5/q1/choice-b.png","alt":"choice","width":null,"height":null,"orderIndex":1}]',
      1,
      '2026-01-02T00:00:00Z'
    );
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

describe("question detail queries", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("returns question detail text, choices, answer, explanation, and image references", async () => {
    const db = await createQuestionBankFixture();

    try {
      expect(getQuestionDetail(db, "https://example.test/r5/q1.html")).toEqual({
        questionUrl: "https://example.test/r5/q1.html",
        sourceUrl: "https://example.test/r5/q1.html",
        questionText:
          "Question text\n![diagram](/assets/fe-siken/r5/q1/question.png)",
        choices: [
          { label: "A", text: "Choice A" },
          {
            label: "B",
            text: "Choice B with ![choice](/assets/fe-siken/r5/q1/choice-b.png)",
          },
          { label: "C", text: "Choice C" },
          { label: "D", text: "Choice D" },
        ],
        answer: "B",
        explanation:
          "Explanation with ![explanation](/assets/fe-siken/r5/q1/explanation.png)",
        hasImages: true,
        images: [
          {
            section: "question",
            choiceLabel: null,
            url: "https://example.test/question.png",
            localPath: "docs/assets/fe-siken/r5/q1/question.png",
            publicPath: "/assets/fe-siken/r5/q1/question.png",
            alt: "diagram",
            width: "640",
            height: "320",
            orderIndex: 0,
          },
          {
            section: "choice",
            choiceLabel: "B",
            url: "https://example.test/choice-b.png",
            localPath: "docs/assets/fe-siken/r5/q1/choice-b.png",
            publicPath: "/assets/fe-siken/r5/q1/choice-b.png",
            alt: "choice",
            width: null,
            height: null,
            orderIndex: 1,
          },
        ],
        fetchedAt: "2026-01-02T00:00:00Z",
      });
    } finally {
      db.close();
    }
  });

  it("returns null when the question detail URL is missing", async () => {
    const db = await createQuestionBankFixture();

    try {
      expect(getQuestionDetail(db, "https://example.test/missing.html")).toBe(
        null
      );
    } finally {
      db.close();
    }
  });

  it("throws a clear error when choices_json is invalid", async () => {
    const db = await createQuestionBankFixture();

    try {
      db.prepare(
        "UPDATE question_details SET choices_json = ? WHERE question_url = ?"
      ).run("{bad json", "https://example.test/r5/q1.html");

      expect(() =>
        getQuestionDetail(db, "https://example.test/r5/q1.html")
      ).toThrow(
        "Invalid choices_json for question detail https://example.test/r5/q1.html"
      );
    } finally {
      db.close();
    }
  });

  it("throws a clear error when images_json is invalid", async () => {
    const db = await createQuestionBankFixture();

    try {
      db.prepare(
        "UPDATE question_details SET images_json = ? WHERE question_url = ?"
      ).run("{bad json", "https://example.test/r5/q1.html");

      expect(() =>
        getQuestionDetail(db, "https://example.test/r5/q1.html")
      ).toThrow(
        "Invalid images_json for question detail https://example.test/r5/q1.html"
      );
    } finally {
      db.close();
    }
  });

  it("throws a clear error when images_json contains invalid image metadata", async () => {
    const db = await createQuestionBankFixture();

    try {
      db.prepare(
        "UPDATE question_details SET images_json = ? WHERE question_url = ?"
      ).run(
        '[{"section":"question","orderIndex":"0"}]',
        "https://example.test/r5/q1.html"
      );

      expect(() =>
        getQuestionDetail(db, "https://example.test/r5/q1.html")
      ).toThrow(
        "Invalid images_json for question detail https://example.test/r5/q1.html: expected numeric orderIndex"
      );
    } finally {
      db.close();
    }
  });
});

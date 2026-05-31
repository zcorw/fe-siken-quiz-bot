import Database from "better-sqlite3";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openQuestionBank, resolveQuestionBankPath } from "./client";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-question-bank-"));
  tempDirs.push(tempDir);
  return tempDir;
}

async function createQuestionBankFixture(): Promise<string> {
  const tempDir = await makeTempDir();
  const dbPath = path.join(tempDir, "questions.sqlite");
  const db = new Database(dbPath);

  try {
    db.exec(`
      CREATE TABLE questions (
        id INTEGER PRIMARY KEY,
        prompt TEXT NOT NULL
      );
      INSERT INTO questions (prompt) VALUES ('fixture question');
    `);
  } finally {
    db.close();
  }

  return dbPath;
}

describe("question bank client", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("resolves the question database path from QUESTION_DB_PATH", () => {
    expect(
      resolveQuestionBankPath({
        QUESTION_DB_PATH: "C:\\data\\fe_siken_questions.sqlite",
      })
    ).toBe("C:\\data\\fe_siken_questions.sqlite");
  });

  it("rejects a missing question database path", () => {
    expect(() => resolveQuestionBankPath({})).toThrow(
      /QUESTION_DB_PATH is required/
    );
  });

  it("opens an existing question database readonly", async () => {
    const dbPath = await createQuestionBankFixture();
    const db = openQuestionBank({ path: dbPath });

    try {
      const row = db
        .prepare("SELECT prompt FROM questions WHERE id = ?")
        .get(1);

      expect(row).toEqual({ prompt: "fixture question" });
      expect(() => {
        db.prepare("INSERT INTO questions (prompt) VALUES (?)").run("write");
      }).toThrow(/readonly|read-only|attempt to write/i);
    } finally {
      db.close();
    }
  });

  it("rejects a missing question database file", async () => {
    const tempDir = await makeTempDir();
    const missingDbPath = path.join(tempDir, "missing.sqlite");

    expect(() => openQuestionBank({ path: missingDbPath })).toThrow(
      /Question database file does not exist/
    );
  });
});

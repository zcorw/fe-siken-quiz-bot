import Database from "better-sqlite3";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { openAppDb, type AppDbClient } from "@/db/app/client";
import { users } from "@/db/app/schema";

const migrationsDir = path.join(process.cwd(), "drizzle");
const tempDirs: string[] = [];
const appDbClients: AppDbClient[] = [];
const questionDbs: Database.Database[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), prefix));
  tempDirs.push(tempDir);
  return tempDir;
}

async function loadMigrationSql(): Promise<string> {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migration directory not found: ${migrationsDir}`);
  }

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  return (
    await Promise.all(
      migrationFiles.map((file) =>
        readFile(path.join(migrationsDir, file), "utf8")
      )
    )
  ).join("\n");
}

export async function cleanupIntegrationFixtures(): Promise<void> {
  for (const questionDb of questionDbs.splice(0)) {
    try {
      questionDb.close();
    } catch {
      // Test cleanup should be idempotent when a test closes a fixture directly.
    }
  }

  for (const appDb of appDbClients.splice(0)) {
    try {
      appDb.close();
    } catch {
      // Test cleanup should be idempotent when a test closes a fixture directly.
    }
  }

  await Promise.all(
    tempDirs
      .splice(0)
      .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
  );
}

export interface CreateMigratedAppDbFixtureOptions {
  seedUser?: boolean;
}

export async function createMigratedAppDbFixture({
  seedUser = true,
}: CreateMigratedAppDbFixtureOptions = {}): Promise<AppDbClient> {
  const tempDir = await makeTempDir("fe-integration-app-");
  const appDb = openAppDb({ path: path.join(tempDir, "app.sqlite") });
  appDbClients.push(appDb);
  appDb.sqlite.exec(await loadMigrationSql());
  appDb.sqlite.pragma("foreign_keys = ON");

  if (seedUser) {
    await appDb.db.insert(users).values({
      id: "user-1",
      telegramUserId: "telegram-1",
      telegramUsername: "fixture_user",
      createdAt: "2026-05-31T00:00:00.000Z",
      lastSeenAt: "2026-05-31T00:00:00.000Z",
    });
  }

  return appDb;
}

export interface CreateQuestionBankFixtureOptions {
  questionCount?: number;
  category?: string;
  topic?: string;
}

export async function createQuestionBankFixture({
  category = "\u30c6\u30af\u30ce\u30ed\u30b8\u7cfb",
  questionCount = 20,
  topic = "\u30c7\u30fc\u30bf\u30d9\u30fc\u30b9",
}: CreateQuestionBankFixtureOptions = {}): Promise<Database.Database> {
  const tempDir = await makeTempDir("fe-integration-question-bank-");
  const db = new Database(path.join(tempDir, "questions.sqlite"));
  questionDbs.push(db);

  db.exec(`
    CREATE TABLE questions (
      id INTEGER PRIMARY KEY,
      source_page_label TEXT,
      source_page_url TEXT,
      exam_part TEXT,
      question_no TEXT,
      topic TEXT,
      category TEXT,
      url TEXT NOT NULL UNIQUE,
      scraped_at TEXT
    );

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
  `);

  const insertQuestion = db.prepare(`
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insert = db.prepare(`
    INSERT INTO question_details (
      question_url,
      question_text,
      choices_json,
      answer,
      explanation,
      images_json,
      has_images,
      fetched_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let index = 1; index <= questionCount; index += 1) {
    insertQuestion.run(
      index,
      "\u4ee4\u548c6\u5e74\u6625",
      "https://example.test/source.html",
      "\u79d1\u76eeA",
      `\u554f${index}`,
      topic,
      category,
      `https://example.test/q${index}.html`,
      "2026-05-31T00:00:00.000Z"
    );

    insert.run(
      `https://example.test/q${index}.html`,
      `\u554f\u984c\u6587 ${index}`,
      JSON.stringify({
        "\u30a2": "\u9078\u629e\u80a2A",
        "\u30a4": "\u9078\u629e\u80a2B",
      }),
      "\u30a2",
      `\u89e3\u8aac ${index}`,
      "[]",
      0,
      "2026-05-31T00:00:00.000Z"
    );
  }

  return db;
}

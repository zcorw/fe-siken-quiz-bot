/**
 * @vitest-environment node
 */
import { eq } from "drizzle-orm";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { openAppDb, type AppDbClient } from "../client";
import { scopeParseLogs, users } from "../schema";
import { writeScopeParseLog } from "./scope-logs";

const migrationsDir = path.join(process.cwd(), "drizzle");
const tempDirs: string[] = [];

async function loadMigrationSql(): Promise<string> {
  expect(existsSync(migrationsDir)).toBe(true);

  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  return migrationFiles
    .map((file) => readFileSync(path.join(migrationsDir, file), "utf8"))
    .join("\n");
}

async function createMigratedAppDb(): Promise<AppDbClient> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-scope-log-repo-"));
  tempDirs.push(tempDir);

  const appDb = openAppDb({ path: path.join(tempDir, "app.sqlite") });
  appDb.sqlite.exec(await loadMigrationSql());
  appDb.sqlite.pragma("foreign_keys = ON");

  await appDb.db.insert(users).values({
    id: "user-1",
    telegramUserId: "telegram-1",
    telegramUsername: "fixture_user",
    createdAt: "2026-05-31T00:00:00.000Z",
    lastSeenAt: "2026-05-31T00:00:00.000Z",
  });

  return appDb;
}

describe("writeScopeParseLog", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("writes a traceable scope parse log row", async () => {
    const appDb = await createMigratedAppDb();

    try {
      await writeScopeParseLog(appDb.db, {
        id: "scope-log-1",
        userId: "user-1",
        rawInput: "数据库",
        method: "alias",
        matchedScope: {
          matchedTopics: ["データベース"],
          matchedCategories: [],
        },
        suggestions: [],
        status: "matched",
        errorMessage: null,
        createdAt: "2026-05-31T01:00:00.000Z",
      });

      const [row] = await appDb.db
        .select()
        .from(scopeParseLogs)
        .where(eq(scopeParseLogs.id, "scope-log-1"));

      expect(row).toMatchObject({
        userId: "user-1",
        rawInput: "数据库",
        method: "alias",
        status: "matched",
        errorMessage: null,
        createdAt: "2026-05-31T01:00:00.000Z",
      });
      expect(JSON.parse(row.matchedScopeJson ?? "{}")).toEqual({
        matchedTopics: ["データベース"],
        matchedCategories: [],
      });
      expect(JSON.parse(row.suggestionsJson ?? "[]")).toEqual([]);
    } finally {
      appDb.close();
    }
  });
});

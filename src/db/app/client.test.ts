/**
 * @vitest-environment node
 */
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openAppDb, resolveAppDbPath } from "./client";

const tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-app-db-"));
  tempDirs.push(tempDir);
  return tempDir;
}

describe("app database client", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("rejects a missing app database path", () => {
    expect(() => resolveAppDbPath({})).toThrow(/APP_DB_PATH is required/);
  });

  it("resolves the app database path from APP_DB_PATH", () => {
    expect(resolveAppDbPath({ APP_DB_PATH: "C:\\data\\app.sqlite" })).toBe(
      "C:\\data\\app.sqlite"
    );
  });

  it("opens a writable app database with WAL and foreign keys enabled", async () => {
    const tempDir = await makeTempDir();
    const dbPath = path.join(tempDir, "app.sqlite");
    const appDb = openAppDb({ path: dbPath });

    try {
      expect(appDb.path).toBe(dbPath);
      expect(appDb.journalMode).toBe("wal");
      expect(appDb.sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
      expect(appDb.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
      expect(appDb.db).toBeDefined();

      appDb.sqlite.exec(
        "CREATE TABLE writable_fixture (id INTEGER PRIMARY KEY, value TEXT)"
      );
      appDb.sqlite
        .prepare("INSERT INTO writable_fixture (value) VALUES (?)")
        .run("created");

      expect(
        appDb.sqlite
          .prepare("SELECT value FROM writable_fixture WHERE id = ?")
          .get(1)
      ).toEqual({ value: "created" });
    } finally {
      appDb.close();
    }
  });
});

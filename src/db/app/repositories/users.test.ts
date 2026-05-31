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
import { users } from "../schema";
import { upsertTelegramUser } from "./users";

const migrationsDir = path.join(process.cwd(), "drizzle");
const tempDirs: string[] = [];

async function createMigratedAppDb(): Promise<AppDbClient> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "fe-user-repo-"));
  tempDirs.push(tempDir);

  const appDb = openAppDb({ path: path.join(tempDir, "app.sqlite") });
  const migrationSql = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => {
      expect(existsSync(path.join(migrationsDir, file))).toBe(true);
      return readFileSync(path.join(migrationsDir, file), "utf8");
    })
    .join("\n");
  appDb.sqlite.exec(migrationSql);
  appDb.sqlite.pragma("foreign_keys = ON");

  return appDb;
}

describe("upsertTelegramUser", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((tempDir) => rm(tempDir, { recursive: true, force: true }))
    );
  });

  it("creates a Telegram user and updates mutable profile fields on repeat", async () => {
    const appDb = await createMigratedAppDb();

    try {
      const created = await upsertTelegramUser(appDb.db, {
        telegramUserId: "telegram-1",
        telegramUsername: "first_name",
        nowIso: "2026-05-31T01:00:00.000Z",
      });
      const updated = await upsertTelegramUser(appDb.db, {
        telegramUserId: "telegram-1",
        telegramUsername: "updated_name",
        nowIso: "2026-05-31T01:30:00.000Z",
      });

      expect(updated.id).toBe(created.id);

      const [row] = await appDb.db
        .select()
        .from(users)
        .where(eq(users.telegramUserId, "telegram-1"));
      expect(row).toMatchObject({
        id: created.id,
        telegramUsername: "updated_name",
        createdAt: "2026-05-31T01:00:00.000Z",
        lastSeenAt: "2026-05-31T01:30:00.000Z",
      });
    } finally {
      appDb.close();
    }
  });
});

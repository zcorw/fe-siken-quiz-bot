import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type AppDbEnv = Readonly<Record<string, string | undefined>>;

export type AppDrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

export interface AppDbClient {
  path: string;
  sqlite: Database.Database;
  db: AppDrizzleDb;
  journalMode: string;
  close: () => void;
}

export interface OpenAppDbOptions {
  env?: AppDbEnv;
  path?: string;
}

export function resolveAppDbPath(env: AppDbEnv = process.env): string {
  const dbPath = env.APP_DB_PATH?.trim();

  if (!dbPath) {
    throw new Error("APP_DB_PATH is required to open the app database.");
  }

  return dbPath;
}

export function openAppDb(options: OpenAppDbOptions = {}): AppDbClient {
  const dbPath = options.path ?? resolveAppDbPath(options.env);
  const sqlite = new Database(dbPath);

  try {
    const journalMode = String(
      sqlite.pragma("journal_mode = WAL", { simple: true })
    ).toLowerCase();

    if (journalMode !== "wal") {
      throw new Error(`Expected SQLite journal_mode WAL, got ${journalMode}.`);
    }

    sqlite.pragma("foreign_keys = ON");

    return {
      path: dbPath,
      sqlite,
      db: drizzle(sqlite, { schema }),
      journalMode,
      close: () => sqlite.close(),
    };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

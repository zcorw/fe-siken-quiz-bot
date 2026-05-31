import Database from "better-sqlite3";
import { existsSync } from "node:fs";

type QuestionBankEnv = Readonly<Record<string, string | undefined>>;

export type QuestionBankClient = Database.Database;

export interface OpenQuestionBankOptions {
  env?: QuestionBankEnv;
  path?: string;
}

export function resolveQuestionBankPath(
  env: QuestionBankEnv = process.env
): string {
  const dbPath = env.QUESTION_DB_PATH?.trim();

  if (!dbPath) {
    throw new Error(
      "QUESTION_DB_PATH is required to open the question database."
    );
  }

  return dbPath;
}

export function openQuestionBank(
  options: OpenQuestionBankOptions = {}
): QuestionBankClient {
  const dbPath = options.path ?? resolveQuestionBankPath(options.env);

  if (!existsSync(dbPath)) {
    throw new Error(`Question database file does not exist: ${dbPath}`);
  }

  try {
    return new Database(dbPath, {
      fileMustExist: true,
      readonly: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to open question database at ${dbPath}: ${message}`
    );
  }
}

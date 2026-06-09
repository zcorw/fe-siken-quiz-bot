import { openQuestionBank, resolveQuestionBankPath } from "./client";
import { HttpQuestionBankProvider } from "./http-provider";
import type { QuestionBankProvider } from "./provider";
import { SqliteQuestionBankProvider } from "./sqlite-provider";

type QuestionBankProviderEnv = Readonly<Record<string, string | undefined>>;

export type QuestionBankProviderConfig =
  | {
      mode: "sqlite";
      sqlitePath: string;
    }
  | {
      mode: "http";
      serviceUrl: string;
    };

export interface CreateQuestionBankProviderOptions {
  env?: QuestionBankProviderEnv;
  createSqliteProvider?: (options: { path: string }) => QuestionBankProvider;
}

export function readQuestionBankProviderConfig(
  env: QuestionBankProviderEnv = process.env
): QuestionBankProviderConfig {
  const mode = env.QUESTION_BANK_MODE?.trim().toLowerCase() || "sqlite";

  if (mode === "sqlite") {
    return {
      mode,
      sqlitePath: resolveQuestionBankPath(env),
    };
  }

  if (mode === "http") {
    const serviceUrl = env.QUESTION_BANK_SERVICE_URL?.trim();
    if (!serviceUrl) {
      throw new Error(
        "QUESTION_BANK_SERVICE_URL is required when QUESTION_BANK_MODE=http."
      );
    }

    return {
      mode,
      serviceUrl,
    };
  }

  throw new Error("QUESTION_BANK_MODE must be sqlite or http.");
}

export function createQuestionBankProvider(
  options: CreateQuestionBankProviderOptions = {}
): QuestionBankProvider {
  const config = readQuestionBankProviderConfig(options.env);

  if (config.mode === "http") {
    return new HttpQuestionBankProvider({ baseUrl: config.serviceUrl });
  }

  return (
    options.createSqliteProvider?.({ path: config.sqlitePath }) ??
    new SqliteQuestionBankProvider({
      db: openQuestionBank({ path: config.sqlitePath }),
    })
  );
}

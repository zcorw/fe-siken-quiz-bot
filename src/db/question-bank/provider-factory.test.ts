import { describe, expect, it } from "vitest";

import { HttpQuestionBankProvider } from "./http-provider";
import {
  createQuestionBankProvider,
  readQuestionBankProviderConfig,
} from "./provider-factory";
import type { QuestionBankProvider } from "./provider";

function stubProvider(): QuestionBankProvider {
  return {
    listKeywords: async () => ({ categories: [], topics: [] }),
    findCandidates: async () => [],
    getDetailByUrl: async () => null,
    getDetailsByUrls: async () => [],
  };
}

describe("readQuestionBankProviderConfig", () => {
  it("defaults to sqlite mode", () => {
    expect(readQuestionBankProviderConfig({ QUESTION_DB_PATH: "./questions.sqlite" })).toEqual({
      mode: "sqlite",
      sqlitePath: "./questions.sqlite",
    });
  });

  it("reads http mode with a service URL", () => {
    expect(
      readQuestionBankProviderConfig({
        QUESTION_BANK_MODE: "http",
        QUESTION_BANK_SERVICE_URL: " http://127.0.0.1:8124/ ",
      })
    ).toEqual({
      mode: "http",
      serviceUrl: "http://127.0.0.1:8124/",
    });
  });

  it("rejects http mode without a service URL", () => {
    expect(() => readQuestionBankProviderConfig({ QUESTION_BANK_MODE: "http" })).toThrow(
      "QUESTION_BANK_SERVICE_URL is required when QUESTION_BANK_MODE=http."
    );
  });

  it("rejects unsupported modes", () => {
    expect(() =>
      readQuestionBankProviderConfig({ QUESTION_BANK_MODE: "remote" })
    ).toThrow("QUESTION_BANK_MODE must be sqlite or http.");
  });
});

describe("createQuestionBankProvider", () => {
  it("uses sqlite mode by default", () => {
    const sqliteProvider = stubProvider();

    const provider = createQuestionBankProvider({
      env: { QUESTION_DB_PATH: "./questions.sqlite" },
      createSqliteProvider: ({ path }) => {
        expect(path).toBe("./questions.sqlite");
        return sqliteProvider;
      },
    });

    expect(provider).toBe(sqliteProvider);
  });

  it("creates an HTTP provider in http mode", () => {
    const provider = createQuestionBankProvider({
      env: {
        QUESTION_BANK_MODE: "http",
        QUESTION_BANK_SERVICE_URL: "http://127.0.0.1:8124",
      },
      createSqliteProvider: () => stubProvider(),
    });

    expect(provider).toBeInstanceOf(HttpQuestionBankProvider);
  });
});

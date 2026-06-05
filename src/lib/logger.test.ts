import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLogger, createRuntimeLogger, logger } from "./logger";

describe("logger", () => {
  it("exposes a base logger configured for info-level JSON logs", () => {
    expect(logger.level).toBe("info");
    expect(logger.bindings()).toEqual({});
  });
});

describe("createLogger", () => {
  it("creates a JSON logger with child bindings", () => {
    const chunks: string[] = [];
    const testStream = {
      write(chunk: string) {
        chunks.push(chunk);
      },
    };
    const childLogger = createLogger({ component: "quiz" }, testStream);

    childLogger.info({ quizId: "quiz-1" }, "quiz generated");

    expect(chunks).toHaveLength(1);
    expect(JSON.parse(chunks[0])).toMatchObject({
      level: 30,
      component: "quiz",
      quizId: "quiz-1",
      msg: "quiz generated",
    });
  });
});

describe("createRuntimeLogger", () => {
  it("writes JSON logs to stdout and an optional file", async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), "fe-quiz-logs-"));
    const logFilePath = path.join(tempDir, "nested", "bot.log");
    const stdoutChunks: string[] = [];

    try {
      const runtimeLogger = createRuntimeLogger({
        bindings: { component: "bot" },
        logFilePath,
        stdout: {
          write(chunk: string) {
            stdoutChunks.push(chunk);
          },
        },
        syncFile: true,
      });

      runtimeLogger.error({ event: "telegram.callback" }, "callback failed");

      expect(stdoutChunks).toHaveLength(1);
      expect(JSON.parse(stdoutChunks[0])).toMatchObject({
        component: "bot",
        event: "telegram.callback",
        level: 50,
        msg: "callback failed",
      });

      const fileContents = await readFile(logFilePath, "utf8");
      expect(JSON.parse(fileContents)).toMatchObject({
        component: "bot",
        event: "telegram.callback",
        level: 50,
        msg: "callback failed",
      });
    } finally {
      await rm(tempDir, { force: true, recursive: true });
    }
  });
});

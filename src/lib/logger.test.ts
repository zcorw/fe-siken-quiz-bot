import { describe, expect, it } from "vitest";
import { createLogger, logger } from "./logger";

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

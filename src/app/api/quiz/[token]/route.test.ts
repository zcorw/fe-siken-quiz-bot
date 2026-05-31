/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import { runtime as quizRuntime } from "./route";
import { runtime as submitRuntime } from "./submit/route";

describe("quiz API route runtime", () => {
  it("uses the Node.js runtime for SQLite access", () => {
    expect(quizRuntime).toBe("nodejs");
    expect(submitRuntime).toBe("nodejs");
  });
});

/**
 * @vitest-environment node
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("bot main question bank startup wiring", () => {
  it("loads question bank keywords through the provider boundary", async () => {
    const source = await readFile(new URL("./main.ts", import.meta.url), "utf8");

    expect(source).toContain("createQuestionBankProvider");
    expect(source).toContain("questionBankProvider.listKeywords()");
    expect(source).not.toContain("listQuestionBankKeywords");
  });
});

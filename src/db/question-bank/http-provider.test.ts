/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";
import { HttpQuestionBankProvider } from "./http-provider";

describe("HttpQuestionBankProvider", () => {
  it("maps runtime API responses to the provider interface", async () => {
    const fetchMock = vi.fn(async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const requestUrl = String(url);
      if (requestUrl.endsWith("/keywords")) {
        return jsonResponse({ categories: ["基礎理論"], topics: ["論理演算"] });
      }
      if (requestUrl.includes("/questions/candidates?")) {
        return jsonResponse([
          {
            questionId: 1,
            sourcePageLabel: "令和6年秋",
            sourcePageUrl: "https://example.test/r6",
            examPart: "科目A",
            questionNo: "問1",
            topic: "論理演算",
            category: "基礎理論",
            questionUrl: "https://example.test/q1",
            scrapedAt: "2026-01-01",
          },
        ]);
      }
      if (requestUrl.includes("/questions/by-url?")) {
        return jsonResponse({
          questionId: 1,
          questionUrl: "https://example.test/q1",
          sourceUrl: "https://example.test/q1",
          questionText: "Question",
          choices: [{ label: "ア", text: "Choice" }],
          hasImages: false,
          images: [],
          fetchedAt: "2026-01-02",
        });
      }
      if (requestUrl.endsWith("/questions/details/batch")) {
        expect(init?.method).toBe("POST");
        return jsonResponse({
          items: [
            {
              questionId: 2,
              questionUrl: "https://example.test/q2",
              sourceUrl: "https://example.test/q2",
              questionText: "Question 2",
              choices: [],
              answer: "ア",
              explanation: "Explanation",
              hasImages: false,
              images: [],
              fetchedAt: "2026-01-02",
            },
          ],
        });
      }
      throw new Error(`Unexpected URL: ${requestUrl}`);
    });
    const provider = new HttpQuestionBankProvider({
      baseUrl: "https://question-bank.test",
      fetchImpl: fetchMock,
    });

    await expect(provider.listKeywords()).resolves.toEqual({
      categories: ["基礎理論"],
      topics: ["論理演算"],
    });
    await expect(provider.findCandidates({ category: "基礎理論" })).resolves.toEqual([
      {
        id: 1,
        sourcePageLabel: "令和6年秋",
        sourcePageUrl: "https://example.test/r6",
        examPart: "科目A",
        questionNo: "問1",
        topic: "論理演算",
        category: "基礎理論",
        url: "https://example.test/q1",
        scrapedAt: "2026-01-01",
      },
    ]);
    await expect(provider.getDetailByUrl("https://example.test/q1")).resolves.toMatchObject({
      questionUrl: "https://example.test/q1",
      answer: null,
      explanation: null,
    });
    await expect(
      provider.getDetailsByUrls(["https://example.test/q2"], { includeAnswer: true })
    ).resolves.toMatchObject([{ questionUrl: "https://example.test/q2", answer: "ア" }]);
  });

  it("maps runtime image metadata to frontend asset paths", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        questionId: 1,
        questionUrl: "https://example.test/q-image",
        sourceUrl: "https://example.test/q-image",
        questionText:
          "Question with image\n\n![diagram](/assets/fe-siken/r7/q1/diagram.png)",
        choices: [],
        hasImages: true,
        images: [
          {
            section: "question",
            choice_label: null,
            url: "https://example.test/diagram.png",
            local_path: "docs/assets/fe-siken/r7/q1/diagram.png",
            public_path: "/assets/fe-siken/r7/q1/diagram.png",
            alt: "diagram",
            width: "640",
            height: "320",
            order_index: 0,
          },
        ],
        fetchedAt: "2026-01-02",
      })
    );
    const provider = new HttpQuestionBankProvider({
      baseUrl: "https://question-bank.test",
      fetchImpl: fetchMock,
    });

    await expect(
      provider.getDetailByUrl("https://example.test/q-image")
    ).resolves.toMatchObject({
      hasImages: true,
      images: [
        {
          alt: "diagram",
          height: "320",
          localPath: "docs/assets/fe-siken/r7/q1/diagram.png",
          orderIndex: 0,
          publicPath: "/assets/fe-siken/r7/q1/diagram.png",
          section: "question",
          width: "640",
        },
      ],
      questionText:
        "Question with image\n\n![diagram](/assets/fe-siken/r7/q1/diagram.png)",
    });
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

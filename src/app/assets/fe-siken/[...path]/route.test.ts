/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

describe("question asset proxy route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("proxies FE-Siken asset requests to the configured question bank service", async () => {
    vi.stubEnv("QUESTION_BANK_SERVICE_URL", "http://question-bank-runtime:8000/");
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "content-type": "image/png" },
        })
      );
    const { GET } = await import("./route");

    const response = await GET(new Request("https://quiz.test/assets/fe-siken/r07/q28.png"), {
      params: Promise.resolve({ path: ["r07", "q28.png"] }),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://question-bank-runtime:8000/assets/fe-siken/r07/q28.png"
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3])
    );
  });

  it("returns upstream 404s without requiring Telegram configuration", async () => {
    vi.stubEnv("QUESTION_BANK_SERVICE_URL", "http://question-bank-runtime:8000");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("missing", { status: 404 }));
    const { GET } = await import("./route");

    const response = await GET(new Request("https://quiz.test/assets/fe-siken/missing.png"), {
      params: { path: ["missing.png"] },
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("missing");
  });

  it("rejects traversal path segments before calling the upstream service", async () => {
    vi.stubEnv("QUESTION_BANK_SERVICE_URL", "http://question-bank-runtime:8000");
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const { GET } = await import("./route");

    const response = await GET(new Request("https://quiz.test/assets/fe-siken/../../admin"), {
      params: { path: ["..", "..", "admin"] },
    });

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Invalid asset path.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

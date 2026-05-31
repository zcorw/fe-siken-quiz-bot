import { describe, expect, it } from "vitest";
import {
  ApiError,
  jsonError,
  jsonSuccess,
  type ApiErrorCode,
} from "./api-response";

describe("ApiError", () => {
  it("stores a typed code, HTTP status, and message", () => {
    const error = new ApiError(
      "INVALID_TOKEN",
      404,
      "Quiz token does not exist"
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ApiError");
    expect(error.code satisfies ApiErrorCode).toBe("INVALID_TOKEN");
    expect(error.status).toBe(404);
    expect(error.message).toBe("Quiz token does not exist");
  });
});

describe("jsonError", () => {
  it("returns a JSON response with status and normalized error body", async () => {
    const response = jsonError(
      new ApiError("TOKEN_EXPIRED", 410, "Quiz token has expired")
    );

    await expect(response.json()).resolves.toEqual({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Quiz token has expired",
      },
    });
    expect(response.status).toBe(410);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

describe("jsonSuccess", () => {
  it("returns a JSON response with the provided body and status", async () => {
    const response = jsonSuccess({ status: "submitted" }, { status: 201 });

    await expect(response.json()).resolves.toEqual({ status: "submitted" });
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
  });
});

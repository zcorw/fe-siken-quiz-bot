import { RateLimiterMemory } from "rate-limiter-flexible";

import { ApiError } from "./api-response";

export interface MemoryRateLimiterOptions {
  points: number;
  durationSeconds: number;
}

export type MemoryRateLimiter = RateLimiterMemory;

export function createMemoryRateLimiter({
  points,
  durationSeconds,
}: MemoryRateLimiterOptions): MemoryRateLimiter {
  return new RateLimiterMemory({
    points,
    duration: durationSeconds,
  });
}

export async function consumeRateLimit(
  limiter: MemoryRateLimiter,
  key: string
): Promise<void> {
  try {
    await limiter.consume(key);
  } catch {
    throw new ApiError("RATE_LIMITED", 429, "Too many requests.");
  }
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor !== null && forwardedFor.trim() !== "") {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

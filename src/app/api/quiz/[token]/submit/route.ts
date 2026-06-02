import { openAppDb } from "@/db/app/client";
import { openQuestionBank } from "@/db/question-bank/client";
import { ApiError, jsonError, jsonSuccess } from "@/lib/api-response";
import {
  consumeRateLimit,
  createMemoryRateLimiter,
  getClientIp,
} from "@/lib/rate-limit";
import { submitQuizByToken } from "@/quiz/submit-service";

export const runtime = "nodejs";

const submitIpLimiter = createMemoryRateLimiter({
  points: 10,
  durationSeconds: 60,
});
const submitTokenLimiter = createMemoryRateLimiter({
  points: 3,
  durationSeconds: 60,
});

interface RouteContext {
  params: Promise<{ token: string }> | { token: string };
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<Response> {
  const { token } = await context.params;
  const appDb = openAppDb();
  const questionDb = openQuestionBank();

  try {
    const clientIp = getClientIp(request);
    await consumeRateLimit(submitIpLimiter, `submit:ip:${clientIp}`);
    await consumeRateLimit(submitTokenLimiter, `submit:token:${token}`);

    return jsonSuccess(
      await submitQuizByToken({
        appDb: appDb.db,
        questionDb,
        token,
        request: await request.json(),
        submittedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    return jsonError(
      new ApiError(
        "SUBMIT_FAILED",
        500,
        `Failed to submit: ${formatUnexpectedErrorReason(error)}`
      )
    );
  } finally {
    appDb.close();
    questionDb.close();
  }
}

function formatUnexpectedErrorReason(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  if (typeof error === "string" && error.trim() !== "") {
    return error;
  }

  return "Unknown error.";
}

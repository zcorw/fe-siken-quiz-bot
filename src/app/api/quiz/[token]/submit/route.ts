import { openAppDb } from "@/db/app/client";
import { openQuestionBank } from "@/db/question-bank/client";
import { ApiError, jsonError, jsonSuccess } from "@/lib/api-response";
import { submitQuizByToken } from "@/quiz/submit-service";

export const runtime = "nodejs";

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

    return jsonError(new ApiError("SUBMIT_FAILED", 500, "Failed to submit."));
  } finally {
    appDb.close();
    questionDb.close();
  }
}

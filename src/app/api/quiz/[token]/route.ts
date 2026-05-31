import { openAppDb } from "@/db/app/client";
import { openQuestionBank } from "@/db/question-bank/client";
import { ApiError, jsonError, jsonSuccess } from "@/lib/api-response";
import { loadQuizByToken } from "@/quiz/quiz-service";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ token: string }> | { token: string };
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<Response> {
  const { token } = await context.params;
  const appDb = openAppDb();
  const questionDb = openQuestionBank();

  try {
    return jsonSuccess(
      await loadQuizByToken({
        appDb: appDb.db,
        questionDb,
        token,
        nowIso: new Date().toISOString(),
      })
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return jsonError(error);
    }

    return jsonError(
      new ApiError("QUIZ_LOAD_FAILED", 500, "Failed to load quiz.")
    );
  } finally {
    appDb.close();
    questionDb.close();
  }
}

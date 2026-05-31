import { initialQuizPageState } from "@/quiz/client/page-state";
import { QuizPageShell } from "@/quiz/components/QuizPageShell";

export default function QuizPage() {
  return <QuizPageShell state={initialQuizPageState} />;
}

import { QuizPageClient } from "@/quiz/components/QuizPageClient";

type QuizPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function QuizPage({ params }: QuizPageProps) {
  const { token } = await params;

  return <QuizPageClient token={token} />;
}

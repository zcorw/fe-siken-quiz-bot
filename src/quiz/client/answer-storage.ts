export type StoredAnswers = Record<number, string>;

function getStorageKey(token: string) {
  return `quiz.answers.${token}`;
}

export function loadStoredAnswers(token: string): StoredAnswers {
  const raw = localStorage.getItem(getStorageKey(token));
  if (!raw) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredAnswers(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
}

export function saveStoredAnswer(
  token: string,
  questionIndex: number,
  selectedAnswer: string
) {
  const answers = loadStoredAnswers(token);
  localStorage.setItem(
    getStorageKey(token),
    JSON.stringify({
      ...answers,
      [questionIndex]: selectedAnswer,
    })
  );
}

export function clearStoredAnswers(token: string) {
  localStorage.removeItem(getStorageKey(token));
}

function isStoredAnswers(value: unknown): value is StoredAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.entries(value).every(([questionIndex, selectedAnswer]) => {
    return /^\d+$/.test(questionIndex) && typeof selectedAnswer === "string";
  });
}

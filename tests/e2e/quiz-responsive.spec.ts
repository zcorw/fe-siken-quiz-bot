import { expect, test } from "@playwright/test";

const quiz = {
  status: "active",
  token: "e2e-token",
  totalQuestions: 20,
  questions: Array.from({ length: 20 }, (_, index) => ({
    index: index + 1,
    questionUrl: `https://www.fe-siken.com/kakomon/sample/q${index + 1}.html`,
    questionText: `問題${index + 1}の本文です。`,
    choices: [
      { label: "ア", text: "公開鍵を用いる。" },
      { label: "イ", text: "共通鍵を用いる。" },
      { label: "ウ", text: "秘密鍵を公開する。" },
      { label: "エ", text: "署名は速度を保証する。" },
    ],
    hasImages: false,
  })),
};

const submitQuizFixture = {
  status: "active",
  token: "e2e-submit-token",
  totalQuestions: 20,
  questions: Array.from({ length: 20 }, (_, index) => ({
    index: index + 1,
    questionUrl: `https://www.fe-siken.com/kakomon/sample/submit-q${index + 1}.html`,
    questionText: `Question ${index + 1} text`,
    choices: [
      { label: "ア", text: "Choice A" },
      { label: "イ", text: "Choice B" },
    ],
    hasImages: false,
  })),
};

const submittedQuizFixture = {
  status: "submitted",
  token: "e2e-submit-token",
  summary: {
    totalQuestions: 20,
    correctCount: 20,
    incorrectCount: 0,
    accuracy: 1,
  },
  selectionSummary: {
    requestedScopeCount: 15,
    reinforcementCount: 5,
    wrongQuestionCount: 0,
    weakTopicCount: 0,
    highWeightTopicCount: 5,
  },
  questions: submitQuizFixture.questions.map((question) => ({
    ...question,
    selectedAnswer: "ア",
    correctAnswer: "ア",
    isCorrect: true,
    explanation: `Explanation ${question.index}`,
    sourceUrl: question.questionUrl,
  })),
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/quiz/e2e-token", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: quiz,
      status: 200,
    });
  });
});

test("captures mobile quiz answer screenshot at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/quiz/e2e-token");

  await expect(page.getByText("問題1の本文です。")).toBeVisible();
  await page.getByRole("button", { name: "問題一覧" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: true });
  expect(screenshot.length).toBeGreaterThan(5_000);
});

test("captures desktop quiz answer screenshot at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/quiz/e2e-token");

  await expect(page.getByText("問題1の本文です。")).toBeVisible();
  await expect(
    page.getByRole("complementary", { name: "問題一覧" })
  ).toBeVisible();

  const screenshot = await page.screenshot({ fullPage: true });
  expect(screenshot.length).toBeGreaterThan(5_000);
});

test("selects 20 answers and submits the quiz", async ({ page }) => {
  let submittedPayload: unknown;

  await page.route("**/api/quiz/e2e-submit-token", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: submitQuizFixture,
      status: 200,
    });
  });
  await page.route("**/api/quiz/e2e-submit-token/submit", async (route) => {
    submittedPayload = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      json: submittedQuizFixture,
      status: 200,
    });
  });

  await page.goto("/quiz/e2e-submit-token");

  for (let index = 1; index <= 20; index += 1) {
    await expect(page.getByText(`Question ${index} text`)).toBeVisible();
    await page.getByRole("button", { name: "ア Choice A" }).click();

    if (index < 20) {
      await page.getByRole("button", { name: "次へ" }).click();
    }
  }

  await page.getByRole("button", { name: "提出する" }).click();

  expect(submittedPayload).toEqual({
    answers: Array.from({ length: 20 }, (_, index) => ({
      questionIndex: index + 1,
      selectedAnswer: "ア",
    })),
  });
  await expect(page.getByTestId("quiz-result-view")).toBeVisible();
  await expect(page.getByRole("heading", { name: "結果" })).toBeVisible();
});

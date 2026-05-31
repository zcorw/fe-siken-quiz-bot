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

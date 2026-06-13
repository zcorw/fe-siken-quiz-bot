import { expect, test } from "@playwright/test";

const imageQuiz = {
  status: "active",
  token: "e2e-image-token",
  totalQuestions: 20,
  questions: Array.from({ length: 20 }, (_, index) => ({
    index: index + 1,
    questionUrl: `https://www.fe-siken.com/kakomon/sample/image-q${index + 1}.html`,
    questionText:
      index === 0
        ? "Question with image\n\n![diagram](/assets/fe-siken/e2e/q1.png)"
        : `Question ${index + 1} text`,
    choices: [
      { label: "A", text: "Choice A" },
      { label: "B", text: "Choice B" },
    ],
    hasImages: index === 0,
  })),
};

test("renders a quiz question image through the asset proxy path", async ({
  page,
}) => {
  let imageRequested = false;

  await page.route("**/api/quiz/e2e-image-token", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: imageQuiz,
      status: 200,
    });
  });
  await page.route("**/assets/fe-siken/e2e/q1.png", async (route) => {
    imageRequested = true;
    await route.fulfill({
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP8z8AARQAArgB83SpNkgAAAABJRU5ErkJggg==",
        "base64"
      ),
      contentType: "image/png",
      status: 200,
    });
  });

  await page.goto("/quiz/e2e-image-token");

  const image = page.getByRole("img", { name: "diagram" });
  await expect(image).toHaveAttribute("src", "/assets/fe-siken/e2e/q1.png");
  await expect(image).toBeVisible();
  await expect
    .poll(async () =>
      image.evaluate((element) => (element as HTMLImageElement).complete)
    )
    .toBe(true);
  expect(imageRequested).toBe(true);
});

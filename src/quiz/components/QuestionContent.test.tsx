import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionContent } from "./QuestionContent";

describe("QuestionContent", () => {
  it("renders question markdown and images safely", () => {
    render(
      <QuestionContent
        category="情報セキュリティ"
        questionText={
          "公開鍵暗号方式の **電子署名** に関する問題です。\n\n![図表](/assets/fe-siken/q8.png)<script>alert('x')</script>"
        }
      />
    );

    expect(screen.getByText("情報セキュリティ")).toBeInTheDocument();
    expect(screen.getByText("電子署名")).toBeInTheDocument();
    const image = screen.getByRole("img", { name: "図表" });
    expect(image).toHaveAttribute("src", "/assets/fe-siken/q8.png");
    expect(document.querySelector("script")).not.toBeInTheDocument();
  });

  it("renders an empty-state message when question text is missing", () => {
    render(<QuestionContent category={null} questionText={null} />);

    expect(
      screen.getByText("問題文を読み込めませんでした")
    ).toBeInTheDocument();
  });
});

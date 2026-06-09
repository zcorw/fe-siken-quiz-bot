import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuestionContent } from "./QuestionContent";

const labels = {
  category: "\u60c5\u5831\u30bb\u30ad\u30e5\u30ea\u30c6\u30a3",
  source: "\u51fa\u5178",
  important: "\u96fb\u5b50\u7f72\u540d",
  imageAlt: "\u56f3\u8868",
  fallback:
    "\u554f\u984c\u6587\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f",
  body: "\u672c\u6587\u306f\u6b8b\u308a\u307e\u3059\u3002",
};

describe("QuestionContent", () => {
  it("renders question markdown and images safely", () => {
    render(
      <QuestionContent
        category={labels.category}
        questionText={
          "\u516c\u958b\u9375\u6697\u53f7\u65b9\u5f0f\u306e **\u96fb\u5b50\u7f72\u540d** \u306b\u95a2\u3059\u308b\u554f\u984c\u3067\u3059\u3002\n\n![\u56f3\u8868](/assets/fe-siken/q8.png)<script>alert('x')</script>"
        }
      />
    );

    expect(screen.getByText(labels.category)).toBeInTheDocument();
    expect(screen.getByText(labels.important)).toBeInTheDocument();
    const image = screen.getByRole("img", { name: labels.imageAlt });
    expect(image).toHaveAttribute("src", "/assets/fe-siken/q8.png");
    expect(document.querySelector("script")).not.toBeInTheDocument();
  });

  it("renders HTTP mode question image asset paths", () => {
    render(
      <QuestionContent
        category={null}
        questionText={
          '"\u5546\u54c1"\u8868\u306b\u5bfe\u3059\u308bSQL\u6587\u3068\u540c\u3058\u7d50\u679c\u304c\u5f97\u3089\u308c\u308bSELECT\u6587\u306f\u3069\u308c\u304b\u3002\n\n![06.png/image-size:406\u00d7216](/assets/fe-siken/07_haru/a6/06.png)'
        }
      />
    );

    expect(
      screen.getByRole("img", { name: "06.png/image-size:406\u00d7216" })
    ).toHaveAttribute("src", "/assets/fe-siken/07_haru/a6/06.png");
  });

  it("renders an empty-state message when question text is missing", () => {
    render(<QuestionContent category={null} questionText={null} />);

    expect(screen.getByText(labels.fallback)).toBeInTheDocument();
  });

  it("renders the source link when a question URL is provided", () => {
    render(
      <QuestionContent
        category={labels.category}
        questionText={labels.body}
        sourceUrl="https://www.fe-siken.com/kakomon/sample/q1.html"
      />
    );

    const link = screen.getByRole("link", {
      name: `${labels.source}: https://www.fe-siken.com/kakomon/sample/q1.html`,
    });

    expect(link).toHaveAttribute(
      "href",
      "https://www.fe-siken.com/kakomon/sample/q1.html"
    );
  });

  it("shows an alt and filename placeholder when an image fails to load", () => {
    render(
      <QuestionContent
        category={null}
        questionText={
          "\u672c\u6587\u306f\u6b8b\u308a\u307e\u3059\u3002\n\n![\u56f3\u8868](/assets/fe-siken/q8.png)"
        }
      />
    );

    fireEvent.error(screen.getByRole("img", { name: labels.imageAlt }));

    expect(screen.getByText(labels.body)).toBeInTheDocument();
    expect(screen.getByText(labels.imageAlt)).toBeInTheDocument();
    expect(screen.getByText("q8.png")).toBeInTheDocument();
  });
});

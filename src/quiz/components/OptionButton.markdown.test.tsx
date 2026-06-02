import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OptionButton } from "./OptionButton";

describe("OptionButton markdown rendering", () => {
  it("renders markdown images in option text", () => {
    render(
      <OptionButton
        label={"\u30a6"}
        onSelect={() => undefined}
        selected={false}
        text={"![\u9078\u629e\u80a2\u753b\u50cf](/assets/fe-siken/choice.png)"}
      />
    );

    const image = screen.getByRole("img", {
      name: "\u9078\u629e\u80a2\u753b\u50cf",
    });
    expect(image).toHaveAttribute("src", "/assets/fe-siken/choice.png");
  });
});

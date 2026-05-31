import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OptionButton } from "./OptionButton";

describe("OptionButton", () => {
  it("renders an unselected option and calls onSelect", () => {
    const onSelect = vi.fn();
    render(
      <OptionButton
        label={"\u30a2"}
        onSelect={onSelect}
        selected={false}
        text={"\u516c\u958b\u9375\u3092\u7528\u3044\u308b"}
      />
    );

    const button = screen.getByRole("button", {
      name: "\u30a2 \u516c\u958b\u9375\u3092\u7528\u3044\u308b",
    });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("data-state", "idle");

    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith("\u30a2");
  });

  it("renders a selected option", () => {
    render(
      <OptionButton
        label={"\u30a4"}
        onSelect={() => undefined}
        selected
        text={"\u5171\u901a\u9375\u3092\u7528\u3044\u308b"}
      />
    );

    const button = screen.getByRole("button", {
      name: "\u30a4 \u5171\u901a\u9375\u3092\u7528\u3044\u308b",
    });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("data-state", "selected");
  });

  it("renders submitted correct and incorrect states", () => {
    render(
      <>
        <OptionButton
          label={"\u30a2"}
          onSelect={() => undefined}
          resultState="correct"
          selected
          text={"\u6b63\u89e3"}
        />
        <OptionButton
          label={"\u30a4"}
          onSelect={() => undefined}
          resultState="incorrect"
          selected
          text={"\u3042\u306a\u305f\u306e\u89e3\u7b54"}
        />
      </>
    );

    expect(
      screen.getByRole("button", { name: "\u30a2 \u6b63\u89e3" })
    ).toHaveAttribute("data-state", "correct");
    expect(
      screen.getByRole("button", {
        name: "\u30a4 \u3042\u306a\u305f\u306e\u89e3\u7b54",
      })
    ).toHaveAttribute("data-state", "incorrect");
  });
});

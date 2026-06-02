// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ColorPicker, ColorPickerFormat } from "@/components/ui/color-picker";

afterEach(() => {
  cleanup();
});

describe("ColorPicker", () => {
  it("does not emit a color change when mounted with a controlled value", () => {
    const handleChange = vi.fn();

    render(
      <ColorPicker onChange={handleChange} value="#ff0000">
        <ColorPickerFormat />
      </ColorPicker>,
    );

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("does not emit a color change when syncing a new controlled value", () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <ColorPicker onChange={handleChange} value="#ff0000">
        <ColorPickerFormat />
      </ColorPicker>,
    );

    rerender(
      <ColorPicker onChange={handleChange} value="#00ff00">
        <ColorPickerFormat />
      </ColorPicker>,
    );

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("emits a color change when the user edits the hex value", () => {
    const handleChange = vi.fn();

    render(
      <ColorPicker onChange={handleChange} value="#ff0000">
        <ColorPickerFormat />
      </ColorPicker>,
    );

    fireEvent.change(screen.getByDisplayValue("#FF0000"), {
      target: { value: "#00ff00" },
    });

    expect(handleChange).toHaveBeenCalledWith([0, 255, 0, 1]);
  });
});

import { describe, expect, it } from "vitest";

import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";
import {
  textOverlayInputFromHtml,
  textOverlayInputFromPlainText,
  textOverlayInputUsingCurrentSettings,
} from "@/features/editor/lib/clipboard-text-utils";

const options = {
  pageNumber: 2,
  pageSize: { height: 600, width: 400 },
  textSettings: {
    ...defaultTextOverlay,
    color: "#111827",
    fontId: "helvetica" as const,
    fontSize: 16,
  },
};

describe("clipboard text helpers", () => {
  it("creates plain text overlays from current text settings", () => {
    expect(
      textOverlayInputFromPlainText("  Pasted text  ", options),
    ).toMatchObject({
      color: "#111827",
      fontId: "helvetica",
      fontSize: 16,
      pageNumber: 2,
      text: "Pasted text",
      type: "text",
    });
  });

  it("uses current settings when pasting text without formatting", () => {
    expect(
      textOverlayInputUsingCurrentSettings("Styled words", {
        ...options,
        textSettings: {
          color: "#dc2626",
          fontId: "courier",
          fontSize: 22,
          text: "Text",
        },
      }),
    ).toMatchObject({
      color: "#dc2626",
      fontId: "courier",
      fontSize: 22,
      text: "Styled words",
    });
  });

  it("extracts supported inline styles from html", () => {
    expect(
      textOverlayInputFromHtml(
        '<span style="color: rgb(37, 99, 235); font-size: 24px; font-family: Georgia;">Rich text</span>',
        "Rich text",
        options,
      ),
    ).toMatchObject({
      color: "#2563eb",
      fontId: "times-roman",
      fontSize: 24,
      text: "Rich text",
    });
  });

  it("normalizes rgb colors from copied html before creating overlays", () => {
    expect(
      textOverlayInputFromHtml(
        '<span style="color: rgb(227, 227, 227); font-family: monospace; font-size: 11px;">data-protonpass-role</span>',
        "data-protonpass-role",
        options,
      ),
    ).toMatchObject({
      color: "#e3e3e3",
      fontId: "courier",
      fontSize: 11,
      text: "data-protonpass-role",
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  getTextBaselineOffset,
  getTextLineHeight,
  splitTextOverlayLines,
  wrapTextOverlayLines,
} from "@/features/pdf-export/lib/export-text-utils";

describe("export text utils", () => {
  it("preserves empty lines", () => {
    expect(splitTextOverlayLines("hello\n\nworld")).toEqual([
      "hello",
      "",
      "world",
    ]);
  });

  it("uses the editor text line height multiplier", () => {
    expect(getTextLineHeight(16)).toBe(20);
  });

  it("accounts for half-leading when calculating text baseline offset", () => {
    expect(
      getTextBaselineOffset({
        fontAscent: 11.488,
        fontHeight: 14.8,
        fontSize: 16,
      }),
    ).toBeCloseTo(14.088);
  });

  it("wraps text lines at whitespace before exceeding the overlay width", () => {
    expect(
      wrapTextOverlayLines({
        measureTextWidth: (text) => text.length,
        text: "hello world",
        width: 6,
      }),
    ).toEqual(["hello", "world"]);
  });

  it("hard-wraps words that are wider than the overlay width", () => {
    expect(
      wrapTextOverlayLines({
        measureTextWidth: (text) => text.length,
        text: "abcdef",
        width: 3,
      }),
    ).toEqual(["abc", "def"]);
  });

  it("preserves explicit empty lines while wrapping long lines", () => {
    expect(
      wrapTextOverlayLines({
        measureTextWidth: (text) => text.length,
        text: "abcd\n\nhello world",
        width: 6,
      }),
    ).toEqual(["abcd", "", "hello", "world"]);
  });
});

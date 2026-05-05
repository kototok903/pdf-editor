import { describe, expect, it } from "vitest";

import {
  getTextBaselineOffset,
  getTextLineHeight,
  splitTextOverlayLines,
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
});

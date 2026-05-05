import { describe, expect, it } from "vitest";

import {
  rectToPdfPageRect,
  textRectToPdfPosition,
} from "@/features/pdf-export/lib/export-coordinate-utils";

describe("export coordinate utils", () => {
  it("converts top-left overlay rects to bottom-left PDF page rects", () => {
    expect(
      rectToPdfPageRect({ height: 40, width: 100, x: 20, y: 30 }, 800),
    ).toEqual({ height: 40, width: 100, x: 20, y: 730 });
  });

  it("positions text using its font baseline approximation", () => {
    expect(
      textRectToPdfPosition(
        { height: 40, width: 100, x: 20, y: 30 },
        800,
        13.5,
      ),
    ).toEqual({ x: 20, y: 756.5 });
  });
});

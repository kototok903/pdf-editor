import { describe, expect, it } from "vitest";

import {
  createDefaultOverlayRect,
  pdfRectToViewportRect,
  viewportRectToPdfRect,
} from "@/features/editor/lib/overlay-coordinate-utils";

describe("overlay-coordinate-utils", () => {
  it("converts PDF rects to viewport rects by scale", () => {
    expect(
      pdfRectToViewportRect({ height: 40, width: 100, x: 20, y: 30 }, 1.5),
    ).toEqual({ height: 60, width: 150, x: 30, y: 45 });
  });

  it("converts viewport rects back to PDF rects by scale", () => {
    expect(
      viewportRectToPdfRect({ height: 60, width: 150, x: 30, y: 45 }, 1.5),
    ).toEqual({ height: 40, width: 100, x: 20, y: 30 });
  });

  it("creates a default overlay rect inside the page", () => {
    expect(createDefaultOverlayRect({ height: 800, width: 600 })).toEqual({
      height: 32,
      width: 140,
      x: 72,
      y: 96,
    });
  });
});

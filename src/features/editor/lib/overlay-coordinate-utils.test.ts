import { describe, expect, it } from "vitest";

import {
  clampMovedOverlayRect,
  createDefaultOverlayRect,
  createImageOverlayRectAtPoint,
  createOverlayRectAtPoint,
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

  it("creates a default overlay rect with the point at the middle-left edge", () => {
    expect(
      createOverlayRectAtPoint({ x: 50, y: 75 }, { height: 800, width: 600 }),
    ).toEqual({
      height: 32,
      width: 140,
      x: 50,
      y: 59,
    });
  });

  it("keeps a point-created overlay rect inside the page", () => {
    expect(
      createOverlayRectAtPoint({ x: 590, y: 4 }, { height: 800, width: 600 }),
    ).toEqual({
      height: 32,
      width: 140,
      x: 460,
      y: 0,
    });
  });

  it("creates an image overlay rect centered at a point", () => {
    expect(
      createImageOverlayRectAtPoint(
        { x: 300, y: 400 },
        { height: 800, width: 600 },
        { height: 100, width: 200 },
      ),
    ).toEqual({
      height: 100,
      width: 200,
      x: 200,
      y: 350,
    });
  });

  it("scales a large image overlay rect down for initial placement", () => {
    expect(
      createImageOverlayRectAtPoint(
        { x: 300, y: 400 },
        { height: 800, width: 600 },
        { height: 1000, width: 2000 },
      ),
    ).toEqual({
      height: 110,
      width: 220,
      x: 190,
      y: 345,
    });
  });

  it("keeps an image overlay rect inside the page", () => {
    expect(
      createImageOverlayRectAtPoint(
        { x: 590, y: 790 },
        { height: 800, width: 600 },
        { height: 100, width: 200 },
      ),
    ).toEqual({
      height: 100,
      width: 200,
      x: 400,
      y: 700,
    });
  });

  it("allows moved overlays past page edges while keeping a visible strip", () => {
    expect(
      clampMovedOverlayRect(
        { height: 40, width: 100, x: -95, y: 790 },
        { height: 800, width: 600 },
      ),
    ).toEqual({
      height: 40,
      width: 100,
      x: -92,
      y: 790,
    });
  });

  it("keeps small moved overlays from leaving the page completely", () => {
    expect(
      clampMovedOverlayRect(
        { height: 4, width: 4, x: -20, y: -20 },
        { height: 800, width: 600 },
      ),
    ).toEqual({
      height: 4,
      width: 4,
      x: 0,
      y: 0,
    });
  });
});

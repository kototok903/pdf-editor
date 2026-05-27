import { describe, expect, it } from "vitest";

import {
  rectToPdfPageRect,
  rotatedRectToPdfPageImageOptions,
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

  it("positions rotated images around the visual rect center", () => {
    const rect = { height: 40, width: 100, x: 20, y: 30 };
    const imageOptions = rotatedRectToPdfPageImageOptions(rect, 800, 90);
    const radians = (imageOptions.rotationDegrees * Math.PI) / 180;
    const centerX =
      imageOptions.x +
      Math.cos(radians) * (imageOptions.width / 2) -
      Math.sin(radians) * (imageOptions.height / 2);
    const centerY =
      imageOptions.y +
      Math.sin(radians) * (imageOptions.width / 2) +
      Math.cos(radians) * (imageOptions.height / 2);

    expect(imageOptions.rotationDegrees).toBe(-90);
    expect(centerX).toBeCloseTo(70);
    expect(centerY).toBeCloseTo(750);
  });
});

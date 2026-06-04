import { describe, expect, it } from "vitest";

import { getOpaquePixelBounds } from "@/features/editor/lib/signature-rasterizer";

function createImageData(
  width: number,
  height: number,
  opaquePixels: number[],
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (const pixelIndex of opaquePixels) {
    data[pixelIndex * 4 + 3] = 255;
  }

  return {
    colorSpace: "srgb",
    data,
    height,
    width,
  } as ImageData;
}

describe("getOpaquePixelBounds", () => {
  it("returns null for a fully transparent image", () => {
    expect(getOpaquePixelBounds(createImageData(4, 3, []))).toBeNull();
  });

  it("returns the tight bounds for non-transparent pixels", () => {
    expect(getOpaquePixelBounds(createImageData(6, 5, [8, 10, 20]))).toEqual({
      height: 3,
      width: 3,
      x: 2,
      y: 1,
    });
  });

  it("includes edge pixels", () => {
    expect(getOpaquePixelBounds(createImageData(4, 4, [0, 15]))).toEqual({
      height: 4,
      width: 4,
      x: 0,
      y: 0,
    });
  });
});

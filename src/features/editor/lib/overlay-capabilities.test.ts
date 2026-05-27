import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  getOverlayRotationDegrees,
  isRotatableOverlay,
} from "@/features/editor/lib/overlay-capabilities";

describe("overlay capabilities", () => {
  it("treats image and signature overlays as rotatable", () => {
    const overlays: EditorOverlay[] = [
      {
        assetId: "image-asset",
        id: "image",
        pageNumber: 1,
        rect: { height: 20, width: 20, x: 0, y: 0 },
        rotationDegrees: 45,
        sha256Signature: "image-signature",
        type: "image",
      },
      {
        assetId: "signature-asset",
        id: "signature",
        pageNumber: 1,
        rect: { height: 20, width: 20, x: 0, y: 0 },
        rotationDegrees: 90,
        sha256Signature: "signature-signature",
        type: "signature",
      },
    ];

    expect(overlays.every((overlay) => isRotatableOverlay(overlay))).toBe(true);
  });

  it("does not treat other overlay types as rotatable", () => {
    expect(
      isRotatableOverlay({
        color: "#000000",
        fontId: "helvetica",
        fontSize: 16,
        id: "text",
        pageNumber: 1,
        rect: { height: 20, width: 20, x: 0, y: 0 },
        text: "Hello",
        type: "text",
      }),
    ).toBe(false);
  });

  it("normalizes rotation for rotatable overlays and returns zero otherwise", () => {
    expect(
      getOverlayRotationDegrees({
        assetId: "image-asset",
        id: "image",
        pageNumber: 1,
        rect: { height: 20, width: 20, x: 0, y: 0 },
        rotationDegrees: -45,
        sha256Signature: "image-signature",
        type: "image",
      }),
    ).toBe(315);
    expect(getOverlayRotationDegrees(null)).toBe(0);
  });
});

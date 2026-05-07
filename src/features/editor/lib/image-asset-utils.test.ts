import { describe, expect, it } from "vitest";

import {
  findSupportedImageMimeType,
  isSupportedImageFileName,
  isSupportedImageMimeType,
  supportedImageAcceptValue,
  supportedImageTypeListLabel,
} from "@/features/editor/lib/image-asset-utils";

describe("image asset helpers", () => {
  it("recognizes the shared supported image MIME types", () => {
    expect(isSupportedImageMimeType("image/png")).toBe(true);
    expect(isSupportedImageMimeType("image/jpeg")).toBe(true);
    expect(isSupportedImageMimeType("image/jpg")).toBe(true);
    expect(isSupportedImageMimeType("image/webp")).toBe(true);
    expect(isSupportedImageMimeType("image/gif")).toBe(true);
    expect(isSupportedImageMimeType("image/svg+xml")).toBe(true);
    expect(isSupportedImageMimeType("image/bmp")).toBe(false);
  });

  it("finds the first supported image MIME type and ignores app clipboard data", () => {
    expect(
      findSupportedImageMimeType([
        "application/x.pdf-editor-overlay+json",
        "image/webp",
        "image/png",
      ]),
    ).toBe("image/webp");
    expect(findSupportedImageMimeType(["text/plain", "image/bmp"])).toBeNull();
  });

  it("recognizes supported image file extensions", () => {
    expect(isSupportedImageFileName("scan.PNG")).toBe(true);
    expect(isSupportedImageFileName("signature.svg")).toBe(true);
    expect(isSupportedImageFileName("photo.bmp")).toBe(false);
  });

  it("exposes shared labels for UI messages and file inputs", () => {
    expect(supportedImageTypeListLabel).toBe("PNG, JPG, WebP, GIF, SVG");
    expect(supportedImageAcceptValue).toContain("image/png");
    expect(supportedImageAcceptValue).toContain(".svg");
  });
});

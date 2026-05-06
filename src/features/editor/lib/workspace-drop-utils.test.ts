import { describe, expect, it } from "vitest";

import {
  getWorkspaceDropAction,
  isPdfFile,
  isSupportedImageFile,
} from "@/features/editor/lib/workspace-drop-utils";

describe("workspace drop helpers", () => {
  it("accepts PDF files by MIME type or extension", () => {
    expect(isPdfFile(file("form", "application/pdf"))).toBe(true);
    expect(isPdfFile(file("form.pdf", ""))).toBe(true);
    expect(isPdfFile(file("photo.png", "image/png"))).toBe(false);
  });

  it("accepts supported image files by MIME type or SVG extension", () => {
    expect(isSupportedImageFile(file("photo", "image/png"))).toBe(true);
    expect(isSupportedImageFile(file("signature.svg", ""))).toBe(true);
    expect(isSupportedImageFile(file("form.pdf", "application/pdf"))).toBe(
      false,
    );
  });

  it("only returns PDF drops when no document is open", () => {
    expect(
      getWorkspaceDropAction(
        [file("photo.png", "image/png"), file("form.pdf", "application/pdf")],
        { hasDocument: false },
      )?.type,
    ).toBe("pdf");
  });

  it("returns the first supported PDF or image drop when a document is open", () => {
    expect(
      getWorkspaceDropAction(
        [file("photo.png", "image/png"), file("form.pdf", "application/pdf")],
        { hasDocument: true },
      )?.type,
    ).toBe("image");
  });
});

function file(name: string, type: string) {
  return new File([""], name, { type });
}

/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from "vitest";

import { shouldClearOverlaySelectionOnPagePointerDown } from "@/features/pdf/lib/page-pointer-events";

describe("shouldClearOverlaySelectionOnPagePointerDown", () => {
  it("clears selection for a primary click on the page itself", () => {
    const page = document.createElement("article");

    expect(
      shouldClearOverlaySelectionOnPagePointerDown({
        button: 0,
        currentTarget: page,
        target: page,
      }),
    ).toBe(true);
  });

  it("clears selection for a primary click on the PDF text layer", () => {
    const page = document.createElement("article");
    const textLayer = document.createElement("div");
    textLayer.className = "textLayer";
    page.append(textLayer);

    expect(
      shouldClearOverlaySelectionOnPagePointerDown({
        button: 0,
        currentTarget: page,
        target: textLayer,
      }),
    ).toBe(true);
  });

  it("does not clear selection when clicking an editor overlay", () => {
    const page = document.createElement("article");
    const overlay = document.createElement("div");
    overlay.dataset.editorOverlayId = "overlay-1";
    const child = document.createElement("span");
    overlay.append(child);
    page.append(overlay);

    expect(
      shouldClearOverlaySelectionOnPagePointerDown({
        button: 0,
        currentTarget: page,
        target: child,
      }),
    ).toBe(false);
  });

  it("does not clear selection when clicking an overlay resize handle", () => {
    const page = document.createElement("article");
    const handle = document.createElement("div");
    handle.dataset.editorOverlayHandle = "true";
    page.append(handle);

    expect(
      shouldClearOverlaySelectionOnPagePointerDown({
        button: 0,
        currentTarget: page,
        target: handle,
      }),
    ).toBe(false);
  });

  it("does not clear selection for non-primary buttons", () => {
    const page = document.createElement("article");

    expect(
      shouldClearOverlaySelectionOnPagePointerDown({
        button: 2,
        currentTarget: page,
        target: page,
      }),
    ).toBe(false);
  });
});

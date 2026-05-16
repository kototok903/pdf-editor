import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  getPageLayerOverlays,
  moveOverlayToPageLayer,
} from "@/features/editor/lib/layer-sidebar-utils";

const overlays: EditorOverlay[] = [
  {
    color: "#ffffff",
    id: "page-1-bottom",
    pageNumber: 1,
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "whiteout",
  },
  {
    color: "#000000",
    id: "page-2-only",
    markType: "check",
    pageNumber: 2,
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "mark",
  },
  {
    color: "#000000",
    fontId: "helvetica",
    fontSize: 16,
    id: "page-1-top",
    pageNumber: 1,
    rect: { height: 10, width: 10, x: 0, y: 0 },
    text: "Hello",
    type: "text",
  },
];

describe("layer sidebar utils", () => {
  it("returns only active-page overlays in topmost-first order", () => {
    expect(
      getPageLayerOverlays(overlays, 1).map((overlay) => overlay.id),
    ).toEqual(["page-1-top", "page-1-bottom"]);
  });

  it("moves an overlay below the reference overlay on the target page", () => {
    const nextOverlays = moveOverlayToPageLayer(overlays, {
      insertBelowOverlayId: "page-1-top",
      overlayId: "page-1-bottom",
      pageNumber: 1,
    });

    expect(nextOverlays.map((overlay) => overlay.id)).toEqual([
      "page-2-only",
      "page-1-bottom",
      "page-1-top",
    ]);
    expect(
      getPageLayerOverlays(nextOverlays, 1).map((overlay) => overlay.id),
    ).toEqual(["page-1-top", "page-1-bottom"]);
  });

  it("moves an overlay to the top of the target page without a reference overlay", () => {
    const nextOverlays = moveOverlayToPageLayer(overlays, {
      overlayId: "page-1-bottom",
      pageNumber: 1,
    });

    expect(
      getPageLayerOverlays(nextOverlays, 1).map((overlay) => overlay.id),
    ).toEqual(["page-1-bottom", "page-1-top"]);
  });

  it("moves an overlay to an empty target page without a reference overlay", () => {
    const nextOverlays = moveOverlayToPageLayer(overlays, {
      overlayId: "page-1-top",
      pageNumber: 3,
    });

    expect(
      getPageLayerOverlays(nextOverlays, 3).map((overlay) => overlay.id),
    ).toEqual(["page-1-top"]);
    expect(
      nextOverlays.find((overlay) => overlay.id === "page-1-top"),
    ).toMatchObject({
      pageNumber: 3,
    });
  });

  it("returns the existing overlays when the reference overlay is invalid", () => {
    expect(
      moveOverlayToPageLayer(overlays, {
        insertBelowOverlayId: "missing",
        overlayId: "page-1-top",
        pageNumber: 1,
      }),
    ).toBe(overlays);
  });
});

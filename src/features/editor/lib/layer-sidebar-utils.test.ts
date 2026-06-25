import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  getPageLayerOverlays,
  moveOverlayLayerRelative,
  moveOverlayToPageLayer,
} from "@/features/editor/lib/layer-sidebar-utils";

const overlays: EditorOverlay[] = [
  {
    color: "#ffffff",
    id: "page-1-bottom",
    pageId: "page-1",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "whiteout",
  },
  {
    color: "#000000",
    id: "page-2-only",
    markType: "check",
    pageId: "page-2",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "mark",
  },
  {
    color: "#000000",
    fontId: "helvetica",
    fontSize: 16,
    id: "page-1-top",
    pageId: "page-1",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    text: "Hello",
    type: "text",
  },
];

const mixedPageLayerOverlays: EditorOverlay[] = [
  {
    color: "#ffffff",
    id: "page-1-bottom",
    pageId: "page-1",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "whiteout",
  },
  {
    color: "#000000",
    id: "page-2-first",
    markType: "check",
    pageId: "page-2",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "mark",
  },
  {
    color: "#000000",
    id: "page-1-middle",
    markType: "x",
    pageId: "page-1",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "mark",
  },
  {
    color: "#000000",
    id: "page-2-second",
    markType: "dot",
    pageId: "page-2",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    type: "mark",
  },
  {
    color: "#000000",
    fontId: "helvetica",
    fontSize: 16,
    id: "page-1-top",
    pageId: "page-1",
    rect: { height: 10, width: 10, x: 0, y: 0 },
    text: "Hello",
    type: "text",
  },
];

describe("layer sidebar utils", () => {
  it("returns only active-page overlays in topmost-first order", () => {
    expect(
      getPageLayerOverlays(overlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-top", "page-1-bottom"]);
  });

  it("moves an overlay below the reference overlay on the target page", () => {
    const nextOverlays = moveOverlayToPageLayer(overlays, {
      insertBelowOverlayId: "page-1-top",
      overlayId: "page-1-bottom",
      pageId: "page-1",
    });

    expect(nextOverlays.map((overlay) => overlay.id)).toEqual([
      "page-2-only",
      "page-1-bottom",
      "page-1-top",
    ]);
    expect(
      getPageLayerOverlays(nextOverlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-top", "page-1-bottom"]);
  });

  it("moves an overlay to the top of the target page without a reference overlay", () => {
    const nextOverlays = moveOverlayToPageLayer(overlays, {
      overlayId: "page-1-bottom",
      pageId: "page-1",
    });

    expect(
      getPageLayerOverlays(nextOverlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-bottom", "page-1-top"]);
  });

  it("moves an overlay to an empty target page without a reference overlay", () => {
    const nextOverlays = moveOverlayToPageLayer(overlays, {
      overlayId: "page-1-top",
      pageId: "page-3",
    });

    expect(
      getPageLayerOverlays(nextOverlays, "page-3").map((overlay) => overlay.id),
    ).toEqual(["page-1-top"]);
    expect(
      nextOverlays.find((overlay) => overlay.id === "page-1-top"),
    ).toMatchObject({
      pageId: "page-3",
    });
  });

  it("clamps an overlay inside the loose bounds of a narrower target page", () => {
    const nextOverlays = moveOverlayToPageLayer(
      [
        {
          color: "#000000",
          id: "wide-page-mark",
          markType: "check",
          pageId: "page-1",
          rect: { height: 40, width: 100, x: 560, y: 30 },
          type: "mark",
        },
      ],
      {
        overlayId: "wide-page-mark",
        pageId: "page-2",
        targetPageSize: { height: 800, width: 300 },
      },
    );

    expect(nextOverlays[0]).toMatchObject({
      pageId: "page-2",
      rect: { height: 40, width: 100, x: 292, y: 30 },
    });
  });

  it("does not clamp same-page layer reordering", () => {
    const nextOverlays = moveOverlayToPageLayer(
      [
        {
          color: "#000000",
          id: "same-page-mark",
          markType: "check",
          pageId: "page-1",
          rect: { height: 40, width: 100, x: 560, y: 30 },
          type: "mark",
        },
        {
          color: "#ffffff",
          id: "same-page-whiteout",
          pageId: "page-1",
          rect: { height: 10, width: 10, x: 0, y: 0 },
          type: "whiteout",
        },
      ],
      {
        overlayId: "same-page-mark",
        pageId: "page-1",
        targetPageSize: { height: 800, width: 300 },
      },
    );

    expect(
      nextOverlays.find((overlay) => overlay.id === "same-page-mark")?.rect,
    ).toEqual({ height: 40, width: 100, x: 560, y: 30 });
  });

  it("returns the existing overlays when the reference overlay is invalid", () => {
    expect(
      moveOverlayToPageLayer(overlays, {
        insertBelowOverlayId: "missing",
        overlayId: "page-1-top",
        pageId: "page-1",
      }),
    ).toBe(overlays);
  });

  it("moves an overlay forward above the nearest same-page overlay", () => {
    const nextOverlays = moveOverlayLayerRelative(
      mixedPageLayerOverlays,
      "page-1-middle",
      "forward",
    );

    expect(nextOverlays.map((overlay) => overlay.id)).toEqual([
      "page-1-bottom",
      "page-2-first",
      "page-2-second",
      "page-1-top",
      "page-1-middle",
    ]);
    expect(
      getPageLayerOverlays(nextOverlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-middle", "page-1-top", "page-1-bottom"]);
  });

  it("moves an overlay to the front of its page", () => {
    const nextOverlays = moveOverlayLayerRelative(
      mixedPageLayerOverlays,
      "page-1-bottom",
      "front",
    );

    expect(nextOverlays.map((overlay) => overlay.id)).toEqual([
      "page-2-first",
      "page-1-middle",
      "page-2-second",
      "page-1-top",
      "page-1-bottom",
    ]);
    expect(
      getPageLayerOverlays(nextOverlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-bottom", "page-1-top", "page-1-middle"]);
  });

  it("moves an overlay backward below the nearest same-page overlay", () => {
    const nextOverlays = moveOverlayLayerRelative(
      mixedPageLayerOverlays,
      "page-1-middle",
      "backward",
    );

    expect(nextOverlays.map((overlay) => overlay.id)).toEqual([
      "page-1-middle",
      "page-1-bottom",
      "page-2-first",
      "page-2-second",
      "page-1-top",
    ]);
    expect(
      getPageLayerOverlays(nextOverlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-top", "page-1-bottom", "page-1-middle"]);
  });

  it("moves an overlay to the back of its page", () => {
    const nextOverlays = moveOverlayLayerRelative(
      mixedPageLayerOverlays,
      "page-1-top",
      "back",
    );

    expect(nextOverlays.map((overlay) => overlay.id)).toEqual([
      "page-1-top",
      "page-1-bottom",
      "page-2-first",
      "page-1-middle",
      "page-2-second",
    ]);
    expect(
      getPageLayerOverlays(nextOverlays, "page-1").map((overlay) => overlay.id),
    ).toEqual(["page-1-middle", "page-1-bottom", "page-1-top"]);
  });

  it("returns the existing overlays when relative layer movement is a no-op", () => {
    expect(
      moveOverlayLayerRelative(mixedPageLayerOverlays, "page-1-top", "front"),
    ).toBe(mixedPageLayerOverlays);
    expect(
      moveOverlayLayerRelative(mixedPageLayerOverlays, "page-1-top", "forward"),
    ).toBe(mixedPageLayerOverlays);
    expect(
      moveOverlayLayerRelative(mixedPageLayerOverlays, "page-1-bottom", "back"),
    ).toBe(mixedPageLayerOverlays);
    expect(
      moveOverlayLayerRelative(
        mixedPageLayerOverlays,
        "page-1-bottom",
        "backward",
      ),
    ).toBe(mixedPageLayerOverlays);
  });
});

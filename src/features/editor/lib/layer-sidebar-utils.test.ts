import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";

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
});

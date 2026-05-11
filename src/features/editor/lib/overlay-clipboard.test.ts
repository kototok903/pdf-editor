import { describe, expect, it } from "vitest";

import type { EditorOverlay } from "@/features/editor/editor-types";
import {
  duplicateOverlayInput,
  isSameOverlayClipboardPayload,
  parseOverlayClipboardPayload,
  toOverlayClipboardPayload,
  toOverlayInput,
} from "@/features/editor/lib/overlay-clipboard";

describe("overlay clipboard helpers", () => {
  it("copies overlay data without carrying the overlay id", () => {
    const overlays: EditorOverlay[] = [
      {
        color: "#111827",
        fontId: "helvetica",
        fontSize: 18,
        id: "text-1",
        pageNumber: 1,
        rect: { height: 40, width: 160, x: 24, y: 32 },
        text: "Hello",
        type: "text",
      },
      {
        assetId: "asset-1",
        id: "image-1",
        pageNumber: 1,
        rect: { height: 100, width: 120, x: 40, y: 48 },
        sha256Signature: "signature-1",
        type: "image",
      },
      {
        color: "#2563eb",
        id: "mark-1",
        markType: "check",
        pageNumber: 1,
        rect: { height: 18, width: 18, x: 60, y: 72 },
        type: "mark",
      },
      {
        color: "#ffffff",
        id: "whiteout-1",
        pageNumber: 1,
        rect: { height: 44, width: 120, x: 70, y: 82 },
        type: "whiteout",
      },
    ];

    for (const overlay of overlays) {
      const payload = toOverlayClipboardPayload(overlay);

      expect(payload.sourceOverlayId).toBe(overlay.id);
      expect(payload.overlay).not.toHaveProperty("id");
      expect(payload.overlay.type).toBe(overlay.type);
    }
  });

  it("offsets repeated pastes from the copied rect", () => {
    const payload = toOverlayClipboardPayload({
      color: "#111827",
      fontId: "helvetica",
      fontSize: 18,
      id: "text-1",
      pageNumber: 1,
      rect: { height: 40, width: 160, x: 24, y: 32 },
      text: "Hello",
      type: "text",
    });

    expect(
      toOverlayInput(payload, {
        pageNumber: 2,
        pageSize: { height: 500, width: 400 },
        pasteCount: 3,
      }),
    ).toMatchObject({
      pageNumber: 2,
      rect: { height: 40, width: 160, x: 60, y: 68 },
    });
  });

  it("clamps pasted and duplicated overlays inside the target page", () => {
    const overlay: EditorOverlay = {
      assetId: "asset-1",
      id: "image-1",
      pageNumber: 1,
      rect: { height: 90, width: 110, x: 250, y: 240 },
      sha256Signature: "signature-1",
      type: "image",
    };
    const payload = toOverlayClipboardPayload(overlay);
    const pageSize = { height: 300, width: 320 };

    expect(
      toOverlayInput(payload, {
        pageNumber: 2,
        pageSize,
        pasteCount: 4,
      }).rect,
    ).toEqual({ height: 90, width: 110, x: 210, y: 210 });
    expect(duplicateOverlayInput(overlay, { pageSize }).rect).toEqual({
      height: 90,
      width: 110,
      x: 210,
      y: 210,
    });
  });

  it("compares copied overlay payloads by source and overlay data", () => {
    const overlay: EditorOverlay = {
      color: "#111827",
      fontId: "helvetica",
      fontSize: 18,
      id: "text-1",
      pageNumber: 1,
      rect: { height: 40, width: 160, x: 24, y: 32 },
      text: "Hello",
      type: "text",
    };

    expect(
      isSameOverlayClipboardPayload(
        toOverlayClipboardPayload(overlay),
        toOverlayClipboardPayload(overlay),
      ),
    ).toBe(true);
    expect(
      isSameOverlayClipboardPayload(toOverlayClipboardPayload(overlay), {
        ...toOverlayClipboardPayload(overlay),
        sourceOverlayId: "text-2",
      }),
    ).toBe(false);
  });

  it("rejects unsupported copied overlay payload data", () => {
    const payload = toOverlayClipboardPayload({
      color: "#111827",
      fontId: "helvetica",
      fontSize: 18,
      id: "text-1",
      pageNumber: 1,
      rect: { height: 40, width: 160, x: 24, y: 32 },
      text: "Hello",
      type: "text",
    });

    expect(
      parseOverlayClipboardPayload(
        JSON.stringify({
          ...payload,
          overlay: {
            ...payload.overlay,
            fontId: "comic-sans",
          },
        }),
      ),
    ).toBeNull();
  });

  it("rejects copied whiteout payloads without a color", () => {
    expect(
      parseOverlayClipboardPayload(
        JSON.stringify({
          overlay: {
            pageNumber: 1,
            rect: { height: 44, width: 120, x: 70, y: 82 },
            type: "whiteout",
          },
          sourceOverlayId: "whiteout-1",
          version: 1,
        }),
      ),
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import {
  buildOverlayClipboardWritePlan,
  getSupportedImageFileFromClipboardData,
  readPasteIntentFromClipboardData,
  writeClipboardPlanToEvent,
} from "@/features/editor/lib/editor-clipboard";
import {
  APP_OVERLAY_MIME_TYPE,
  serializeOverlayClipboardPayload,
  toOverlayClipboardPayload,
} from "@/features/editor/lib/overlay-clipboard";

describe("editor clipboard helpers", () => {
  it("builds text overlay copy data with plain text and custom app data", () => {
    const overlay = textOverlay();
    const plan = buildOverlayClipboardWritePlan(overlay, []);

    expect(plan.eventItems.strings["text/plain"]).toBe("Hello");
    expect(plan.eventItems.strings[APP_OVERLAY_MIME_TYPE]).toBe(
      serializeOverlayClipboardPayload(toOverlayClipboardPayload(overlay)),
    );
    expect(plan.hasBinaryItem).toBe(false);
    expect(Object.keys(plan.systemItems).sort()).toEqual(
      [APP_OVERLAY_MIME_TYPE, "text/plain"].sort(),
    );
  });

  it("builds image overlay copy data with image bytes and custom app data", async () => {
    const overlay: EditorOverlay = {
      assetId: "asset-1",
      id: "image-1",
      pageNumber: 1,
      rect: { height: 100, width: 120, x: 40, y: 48 },
      sha256Signature: "signature-1",
      type: "image",
    };
    const plan = buildOverlayClipboardWritePlan(overlay, [imageAsset()]);

    expect(plan.eventItems.strings[APP_OVERLAY_MIME_TYPE]).toBe(
      serializeOverlayClipboardPayload(toOverlayClipboardPayload(overlay)),
    );
    expect(plan.eventItems.strings["text/plain"]).toBeUndefined();
    expect(plan.hasBinaryItem).toBe(true);
    expect(await plan.systemItems["image/png"].text()).toBe("image-bytes");
  });

  it("builds mark overlay copy data with SVG image and custom app data", async () => {
    const overlay: EditorOverlay = {
      color: "#2563eb",
      id: "mark-1",
      markType: "check",
      pageNumber: 1,
      rect: { height: 18, width: 18, x: 60, y: 72 },
      type: "mark",
    };
    const plan = buildOverlayClipboardWritePlan(overlay, []);

    expect(plan.eventItems.strings["text/plain"]).toBeUndefined();
    expect(plan.hasBinaryItem).toBe(true);
    expect(await plan.systemItems["image/svg+xml"].text()).toContain(
      "M6 17.5L12.5 24L26 8",
    );
  });

  it("writes only string data to paste event clipboards", () => {
    const overlay = textOverlay();
    const plan = buildOverlayClipboardWritePlan(overlay, []);
    const addedItems: File[] = [];
    const strings: Record<string, string> = {};

    writeClipboardPlanToEvent(plan, {
      items: {
        add: (file: File) => {
          addedItems.push(file);
          return null;
        },
      },
      setData: (type: string, value: string) => {
        strings[type] = value;
      },
    } as unknown as DataTransfer);

    expect(addedItems).toEqual([]);
    expect(strings["text/plain"]).toBe("Hello");
    expect(strings[APP_OVERLAY_MIME_TYPE]).toBe(
      serializeOverlayClipboardPayload(toOverlayClipboardPayload(overlay)),
    );
  });

  it("reads paste event custom overlay data before image fallback", () => {
    const overlay = textOverlay();
    const intent = readPasteIntentFromClipboardData(
      clipboardData({
        files: [
          new File(["image"], "screenshot.png", {
            type: "image/png",
          }),
        ],
        strings: {
          [APP_OVERLAY_MIME_TYPE]: serializeOverlayClipboardPayload(
            toOverlayClipboardPayload(overlay),
          ),
        },
      }),
    );

    expect(intent.kind).toBe("overlay");
  });

  it("reads paste event image data when no valid custom overlay exists", () => {
    const file = new File(["image"], "screenshot.png", { type: "image/png" });
    const intent = readPasteIntentFromClipboardData(
      clipboardData({
        files: [file],
        strings: {
          [APP_OVERLAY_MIME_TYPE]: "{",
        },
      }),
    );

    expect(intent).toEqual({ blob: file, kind: "external-image" });
  });

  it("extracts supported image files from paste event clipboard data", () => {
    const pngFile = new File(["image"], "screenshot.png", {
      type: "image/png",
    });

    expect(
      getSupportedImageFileFromClipboardData({
        items: [
          clipboardItem("string", "text/plain", null),
          clipboardItem("file", "image/png", pngFile),
        ] as unknown as DataTransferItemList,
      }),
    ).toBe(pngFile);
  });

  it("returns empty paste intent when clipboard data has nothing usable", () => {
    expect(
      readPasteIntentFromClipboardData(
        clipboardData({
          files: [],
          strings: {},
        }),
      ),
    ).toEqual({ kind: "empty" });
  });
});

function textOverlay(): EditorOverlay {
  return {
    color: "#111827",
    fontId: "helvetica",
    fontSize: 18,
    id: "text-1",
    pageNumber: 1,
    rect: { height: 40, width: 160, x: 24, y: 32 },
    text: "Hello",
    type: "text",
  };
}

function imageAsset(): ImageAsset {
  return {
    bytes: new TextEncoder().encode("image-bytes").buffer,
    formatLabel: "PNG",
    height: 100,
    id: "asset-1",
    isHiddenFromRecents: false,
    mimeType: "image/png",
    name: "photo.png",
    objectUrl: "blob:photo",
    sha256Signature: "signature-1",
    source: "upload",
    width: 120,
  };
}

function clipboardData({
  files,
  strings,
}: {
  files: File[];
  strings: Record<string, string>;
}): DataTransfer {
  return {
    getData: (type: string) => strings[type] ?? "",
    items: [
      ...Object.keys(strings).map((type) =>
        clipboardItem("string", type, null),
      ),
      ...files.map((file) => clipboardItem("file", file.type, file)),
    ],
  } as unknown as DataTransfer;
}

function clipboardItem(
  kind: DataTransferItem["kind"],
  type: string,
  file: File | null,
): DataTransferItem {
  return {
    getAsFile: () => file,
    getAsString: () => {},
    kind,
    type,
    webkitGetAsEntry: () => null,
  } as unknown as DataTransferItem;
}

import { describe, expect, it } from "vitest";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { createEditorHistory } from "@/features/editor/lib/editor-history";
import { getPersistedDraftImageAssetIds } from "@/features/editor/hooks/useLocalDraftPersistence";

function createImageAsset(patch: Partial<ImageAsset> = {}): ImageAsset {
  return {
    bytes: new Uint8Array([1, 2, 3]).buffer,
    formatLabel: "PNG",
    height: 80,
    id: "image-1",
    isHiddenFromRecents: false,
    mimeType: "image/png",
    name: "image.png",
    objectUrl: "blob:image-1",
    sha256Signature: "signature-1",
    source: "upload",
    width: 120,
    ...patch,
  };
}

function createImageOverlay(
  patch: Partial<Extract<EditorOverlay, { type: "image" }>> = {},
): Extract<EditorOverlay, { type: "image" }> {
  return {
    assetId: "image-1",
    id: "overlay-image-1",
    pageNumber: 1,
    rect: { height: 40, width: 80, x: 30, y: 40 },
    sha256Signature: "signature-1",
    type: "image",
    ...patch,
  };
}

describe("local draft persistence", () => {
  it("keeps hidden image assets referenced only by undo or redo history", () => {
    const imageAssets = [
      createImageAsset({ id: "present-image", isHiddenFromRecents: true }),
      createImageAsset({ id: "history-image", isHiddenFromRecents: true }),
      createImageAsset({ id: "unreferenced-image", isHiddenFromRecents: true }),
    ];
    const presentOverlay = createImageOverlay({
      assetId: "present-image",
      id: "present-overlay",
    });
    const historyOverlay = createImageOverlay({
      assetId: "history-image",
      id: "history-overlay",
    });
    const history = createEditorHistory([historyOverlay], historyOverlay.id);

    expect(
      getPersistedDraftImageAssetIds(imageAssets, [presentOverlay], history),
    ).toEqual(["present-image", "history-image"]);
  });
});

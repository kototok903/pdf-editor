import { describe, expect, it } from "vitest";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import {
  getPersistedDraftImageAssetIds,
  getPersistedProjectImageAssetIds,
} from "@/features/editor/hooks/useLocalDraftPersistence";
import { createEditorHistory } from "@/features/editor/lib/editor-history";

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
    pageId: "page-1",
    rect: { height: 40, width: 80, x: 30, y: 40 },
    rotationDegrees: 0,
    sha256Signature: "signature-1",
    type: "image",
    ...patch,
  };
}

function createSignatureOverlay(
  patch: Partial<Extract<EditorOverlay, { type: "signature" }>> = {},
): Extract<EditorOverlay, { type: "signature" }> {
  return {
    assetId: "signature-1",
    id: "overlay-signature-1",
    pageId: "page-1",
    rect: { height: 40, width: 160, x: 30, y: 40 },
    rotationDegrees: 0,
    sha256Signature: "signature-sha-1",
    type: "signature",
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

  it("keeps hidden signature assets referenced by overlays", () => {
    const imageAssets = [
      createImageAsset({
        id: "signature-1",
        isHiddenFromRecents: true,
        source: "signature",
      }),
      createImageAsset({
        id: "unused-signature",
        isHiddenFromRecents: true,
        source: "signature",
      }),
    ];
    const signatureOverlay = createSignatureOverlay({
      assetId: "signature-1",
    });

    expect(
      getPersistedDraftImageAssetIds(imageAssets, [signatureOverlay]),
    ).toEqual(["signature-1"]);
  });

  it("keeps hidden image assets referenced by any project history", () => {
    const imageAssets = [
      createImageAsset({ id: "visible-image", isHiddenFromRecents: false }),
      createImageAsset({ id: "project-a-image", isHiddenFromRecents: true }),
      createImageAsset({ id: "project-b-image", isHiddenFromRecents: true }),
      createImageAsset({ id: "unused-image", isHiddenFromRecents: true }),
    ];
    const projectAHistory = createEditorHistory([
      createImageOverlay({
        assetId: "project-a-image",
        id: "project-a-overlay",
      }),
    ]);
    const projectBHistory = createEditorHistory([
      createImageOverlay({
        assetId: "project-b-image",
        id: "project-b-overlay",
      }),
    ]);

    expect(
      getPersistedProjectImageAssetIds(imageAssets, [
        projectAHistory,
        projectBHistory,
      ]),
    ).toEqual(["visible-image", "project-a-image", "project-b-image"]);
  });
});

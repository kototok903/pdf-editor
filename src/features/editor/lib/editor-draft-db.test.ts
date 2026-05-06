import { describe, expect, it } from "vitest";

import {
  activeDraftKey,
  createMemoryEditorDraftStorage,
  readActiveDraft,
  readPersistedImageAssets,
  writeActiveDraft,
  putPersistedImageAssets,
  putPersistedImageAsset,
} from "@/features/editor/lib/editor-draft-db";
import type {
  PersistedEditorDraftRecord,
  PersistedImageAssetRecord,
} from "@/features/editor/lib/editor-draft-db";

function createImageRecord(
  patch: Partial<PersistedImageAssetRecord> = {},
): PersistedImageAssetRecord {
  return {
    bytes: new Uint8Array([1, 2, 3]).buffer,
    createdAt: 100,
    formatLabel: "PNG",
    height: 80,
    id: "image-1",
    isHiddenFromRecents: false,
    lastUsedAt: 200,
    mimeType: "image/png",
    name: "image.png",
    sha256Signature: "abc123",
    source: "upload",
    width: 120,
    ...patch,
  };
}

function createDraftRecord(
  patch: Partial<PersistedEditorDraftRecord> = {},
): PersistedEditorDraftRecord {
  return {
    currentPage: 2,
    fileName: "form.pdf",
    id: activeDraftKey,
    imageAssetIds: ["image-1"],
    overlays: [],
    pdfBytes: new Uint8Array([4, 5, 6]).buffer,
    updatedAt: 300,
    ...patch,
  };
}

describe("editor draft db", () => {
  it("returns empty records when default IndexedDB storage is unavailable", async () => {
    expect(await readPersistedImageAssets()).toEqual([]);
    expect(await readActiveDraft()).toBeNull();
  });

  it("writes active drafts with the active id", async () => {
    const storage = createMemoryEditorDraftStorage();

    await writeActiveDraft(createDraftRecord({ id: "active" }), storage);

    expect(await readActiveDraft(storage)).toEqual(
      expect.objectContaining({ id: activeDraftKey }),
    );
  });

  it("writes image assets with bytes and metadata", async () => {
    const storage = createMemoryEditorDraftStorage();
    const image = createImageRecord();

    await putPersistedImageAsset(image, storage);

    expect(await readPersistedImageAssets(storage)).toEqual([image]);
  });

  it("sorts persisted image assets by most recently used", async () => {
    const storage = createMemoryEditorDraftStorage();

    await putPersistedImageAssets(
      [
        createImageRecord({ id: "older", lastUsedAt: 100 }),
        createImageRecord({ id: "newer", lastUsedAt: 300 }),
      ],
      storage,
    );

    expect(
      (await readPersistedImageAssets(storage)).map((asset) => asset.id),
    ).toEqual(["newer", "older"]);
  });

  it("rejects write failures from storage adapters", async () => {
    const storage = createMemoryEditorDraftStorage({ failWrites: true });

    await expect(
      putPersistedImageAsset(createImageRecord(), storage),
    ).rejects.toThrow("Unable to write local draft data.");
  });
});

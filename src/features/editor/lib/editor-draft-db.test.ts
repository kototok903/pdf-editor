import { describe, expect, it, vi } from "vitest";

import type {
  PersistedEditorDraftRecord,
  PersistedImageAssetRecord,
} from "@/features/editor/lib/editor-draft-db";
import {
  activeDraftKey,
  clearEditorDraftDatabase,
  createMemoryEditorDraftStorage,
  putPersistedImageAsset,
  putPersistedImageAssets,
  readActiveDraft,
  readPersistedImageAssets,
  writeActiveDraft,
} from "@/features/editor/lib/editor-draft-db";
import { createEditorHistory } from "@/features/editor/lib/editor-history";
import { emptyPdfProjectMetadata } from "@/features/pdf/lib/pdf-metadata";

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
    documentSources: [],
    fileName: "form.pdf",
    id: activeDraftKey,
    imageAssetIds: ["image-1"],
    metadata: emptyPdfProjectMetadata,
    overlays: [],
    originalMetadata: emptyPdfProjectMetadata,
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

  it("round-trips form edits in draft history", async () => {
    const storage = createMemoryEditorDraftStorage();
    const history = createEditorHistory([], null, {
      values: [
        { fieldName: "name", pageId: "page-1", type: "text", value: "Привет" },
      ],
    });

    await writeActiveDraft(createDraftRecord({ history }), storage);

    expect(await readActiveDraft(storage)).toEqual(
      expect.objectContaining({
        history: expect.objectContaining({
          present: expect.objectContaining({
            formEdits: {
              values: [
                {
                  fieldName: "name",
                  pageId: "page-1",
                  type: "text",
                  value: "Привет",
                },
              ],
            },
          }),
        }),
      }),
    );
  });

  it("writes multi-project draft records", async () => {
    const storage = createMemoryEditorDraftStorage();
    const projectBytes = new Uint8Array([7, 8, 9]).buffer;

    await writeActiveDraft(
      createDraftRecord({
        activeProjectId: "project-a",
        projects: [
          {
            createdAt: 100,
            currentPage: 1,
            documentSources: [],
            fileName: "a.pdf",
            id: "project-a",
            metadata: emptyPdfProjectMetadata,
            originalMetadata: emptyPdfProjectMetadata,
            pageCount: 2,
            pdfBytes: projectBytes,
            updatedAt: 200,
          },
        ],
      }),
      storage,
    );

    expect(await readActiveDraft(storage)).toEqual(
      expect.objectContaining({
        activeProjectId: "project-a",
        projects: [
          expect.objectContaining({
            fileName: "a.pdf",
            id: "project-a",
            pdfBytes: projectBytes,
          }),
        ],
      }),
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

  it("deletes the editor draft database", async () => {
    const request = {
      error: null,
      onblocked: null,
      onerror: null,
      onsuccess: null,
    } as IDBOpenDBRequest;
    const indexedDb = {
      deleteDatabase: vi.fn(() => request),
    };
    const promise = clearEditorDraftDatabase(indexedDb);

    request.onsuccess?.(new Event("success"));

    await expect(promise).resolves.toBeUndefined();
    expect(indexedDb.deleteDatabase).toHaveBeenCalledWith("pdf-editor:drafts");
  });

  it("ignores missing IndexedDB when deleting the editor draft database", async () => {
    await expect(clearEditorDraftDatabase(undefined)).resolves.toBeUndefined();
  });
});

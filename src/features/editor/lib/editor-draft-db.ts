import type { EditorOverlay } from "@/features/editor/editor-types";

type PersistedImageAssetRecord = {
  bytes: ArrayBuffer;
  createdAt: number;
  formatLabel: string;
  height: number;
  id: string;
  isHiddenFromRecents: boolean;
  lastUsedAt: number;
  mimeType: string;
  name: string;
  sha256Signature: string;
  source: "upload" | "url";
  width: number;
};

type PersistedEditorDraftRecord = {
  currentPage: number;
  fileName: string;
  id: typeof activeDraftKey;
  imageAssetIds: string[];
  overlays: EditorOverlay[];
  pdfBytes: ArrayBuffer;
  updatedAt: number;
};

type EditorDraftStorage = {
  clearActiveDraft: () => Promise<void>;
  deletePersistedImageAsset: (assetId: string) => Promise<void>;
  putPersistedImageAsset: (asset: PersistedImageAssetRecord) => Promise<void>;
  putPersistedImageAssets: (
    assets: PersistedImageAssetRecord[],
  ) => Promise<void>;
  readActiveDraft: () => Promise<PersistedEditorDraftRecord | null>;
  readPersistedImageAssets: () => Promise<PersistedImageAssetRecord[]>;
  writeActiveDraft: (draft: PersistedEditorDraftRecord) => Promise<void>;
};

const editorDraftDbName = "pdf-editor:drafts";
const editorDraftDbVersion = 1;
const imageAssetsStoreName = "imageAssets";
const activeDraftStoreName = "activeDraft";
const activeDraftKey = "active";

async function readPersistedImageAssets(
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  return storage.readPersistedImageAssets();
}

async function putPersistedImageAsset(
  asset: PersistedImageAssetRecord,
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  await storage.putPersistedImageAsset(asset);
}

async function putPersistedImageAssets(
  assets: PersistedImageAssetRecord[],
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  await storage.putPersistedImageAssets(assets);
}

async function deletePersistedImageAsset(
  assetId: string,
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  await storage.deletePersistedImageAsset(assetId);
}

async function readActiveDraft(
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  return storage.readActiveDraft();
}

async function writeActiveDraft(
  draft: PersistedEditorDraftRecord,
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  await storage.writeActiveDraft({ ...draft, id: activeDraftKey });
}

async function clearActiveDraft(
  storage: EditorDraftStorage = createIndexedDbEditorDraftStorage(),
) {
  await storage.clearActiveDraft();
}

function createMemoryEditorDraftStorage({
  failWrites = false,
}: {
  failWrites?: boolean;
} = {}): EditorDraftStorage {
  const imageAssets = new Map<string, PersistedImageAssetRecord>();
  let activeDraft: PersistedEditorDraftRecord | null = null;

  const assertWritable = () => {
    if (failWrites) {
      throw new Error("Unable to write local draft data.");
    }
  };

  return {
    async clearActiveDraft() {
      assertWritable();
      activeDraft = null;
    },
    async deletePersistedImageAsset(assetId) {
      assertWritable();
      imageAssets.delete(assetId);
    },
    async putPersistedImageAsset(asset) {
      assertWritable();
      imageAssets.set(asset.id, asset);
    },
    async putPersistedImageAssets(assets) {
      assertWritable();
      for (const asset of assets) {
        imageAssets.set(asset.id, asset);
      }
    },
    async readActiveDraft() {
      return activeDraft;
    },
    async readPersistedImageAssets() {
      return [...imageAssets.values()].sort(
        (left, right) => right.lastUsedAt - left.lastUsedAt,
      );
    },
    async writeActiveDraft(draft) {
      assertWritable();
      activeDraft = { ...draft, id: activeDraftKey };
    },
  };
}

function createIndexedDbEditorDraftStorage(): EditorDraftStorage {
  return {
    async clearActiveDraft() {
      const database = await openEditorDraftDatabase();

      if (!database) {
        return;
      }

      try {
        await writeToStore(database, activeDraftStoreName, (store) => {
          store.delete(activeDraftKey);
        });
      } finally {
        database.close();
      }
    },
    async deletePersistedImageAsset(assetId) {
      const database = await openEditorDraftDatabase();

      if (!database) {
        return;
      }

      try {
        await writeToStore(database, imageAssetsStoreName, (store) => {
          store.delete(assetId);
        });
      } finally {
        database.close();
      }
    },
    async putPersistedImageAsset(asset) {
      const database = await openEditorDraftDatabase();

      if (!database) {
        return;
      }

      try {
        await writeToStore(database, imageAssetsStoreName, (store) => {
          store.put(asset);
        });
      } finally {
        database.close();
      }
    },
    async putPersistedImageAssets(assets) {
      const database = await openEditorDraftDatabase();

      if (!database || assets.length === 0) {
        return;
      }

      try {
        await writeToStore(database, imageAssetsStoreName, (store) => {
          for (const asset of assets) {
            store.put(asset);
          }
        });
      } finally {
        database.close();
      }
    },
    async readActiveDraft() {
      const database = await openEditorDraftDatabase();

      if (!database) {
        return null;
      }

      try {
        return await requestToPromise<PersistedEditorDraftRecord | undefined>(
          database
            .transaction(activeDraftStoreName, "readonly")
            .objectStore(activeDraftStoreName)
            .get(activeDraftKey),
        ).then((draft) => draft ?? null);
      } finally {
        database.close();
      }
    },
    async readPersistedImageAssets() {
      const database = await openEditorDraftDatabase();

      if (!database) {
        return [];
      }

      try {
        const assets = await requestToPromise<PersistedImageAssetRecord[]>(
          database
            .transaction(imageAssetsStoreName, "readonly")
            .objectStore(imageAssetsStoreName)
            .getAll(),
        );

        return assets.sort((left, right) => right.lastUsedAt - left.lastUsedAt);
      } finally {
        database.close();
      }
    },
    async writeActiveDraft(draft) {
      const database = await openEditorDraftDatabase();

      if (!database) {
        return;
      }

      try {
        await writeToStore(database, activeDraftStoreName, (store) => {
          store.put({ ...draft, id: activeDraftKey });
        });
      } finally {
        database.close();
      }
    },
  };
}

function openEditorDraftDatabase() {
  const indexedDb = getIndexedDb();

  if (!indexedDb) {
    return Promise.resolve(null);
  }

  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDb.open(editorDraftDbName, editorDraftDbVersion);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(imageAssetsStoreName)) {
        const imageAssetStore = database.createObjectStore(
          imageAssetsStoreName,
          { keyPath: "id" },
        );

        imageAssetStore.createIndex("sha256Signature", "sha256Signature");
        imageAssetStore.createIndex("lastUsedAt", "lastUsedAt");
      }

      if (!database.objectStoreNames.contains(activeDraftStoreName)) {
        database.createObjectStore(activeDraftStoreName, { keyPath: "id" });
      }
    };
  });
}

function getIndexedDb() {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

function writeToStore(
  database: IDBDatabase,
  storeName: string,
  write: (store: IDBObjectStore) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, "readwrite");

    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();

    write(transaction.objectStore(storeName));
  });
}

function requestToPromise<Result>(request: IDBRequest<Result>) {
  return new Promise<Result>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export {
  activeDraftKey,
  clearActiveDraft,
  createMemoryEditorDraftStorage,
  deletePersistedImageAsset,
  putPersistedImageAsset,
  putPersistedImageAssets,
  readActiveDraft,
  readPersistedImageAssets,
  writeActiveDraft,
};
export type {
  EditorDraftStorage,
  PersistedEditorDraftRecord,
  PersistedImageAssetRecord,
};

import { useCallback, useEffect, useState } from "react";

import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import {
  activeDraftKey,
  clearActiveDraft,
  putPersistedImageAssets,
  readActiveDraft,
  readPersistedImageAssets,
  writeActiveDraft,
  type PersistedEditorDraftRecord,
} from "@/features/editor/lib/editor-draft-db";
import {
  imageAssetFromPersistedRecord,
  toPersistedImageAssetRecord,
} from "@/features/editor/lib/persisted-image-assets";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type LocalDraftHydrationState = "idle" | "hydrating" | "hydrated" | "error";

type LocalDraftHydrationResult = {
  draft: PersistedEditorDraftRecord | null;
  imageAssets: ImageAsset[];
};

type UseLocalDraftPersistenceOptions = {
  currentPage: number;
  document: LoadedPdfDocument | null;
  imageAssets: ImageAsset[];
  isReadyToPersist: boolean;
  overlays: EditorOverlay[];
};

function useLocalDraftPersistence({
  currentPage,
  document,
  imageAssets,
  isReadyToPersist,
  overlays,
}: UseLocalDraftPersistenceOptions) {
  const [hydrationState, setHydrationState] =
    useState<LocalDraftHydrationState>("idle");

  const hydrateLocalDraft =
    useCallback(async (): Promise<LocalDraftHydrationResult> => {
      setHydrationState("hydrating");

      try {
        const persistedImages = await readPersistedImageAssets();
        const restoredImageAssets = persistedImages.flatMap((record) => {
          try {
            return [imageAssetFromPersistedRecord(record)];
          } catch {
            return [];
          }
        });
        const draft = await readActiveDraft();

        setHydrationState("hydrated");

        return {
          draft,
          imageAssets: restoredImageAssets,
        };
      } catch {
        try {
          await clearActiveDraft();
        } catch {
          // Restore failure should not make the editor unusable.
        }

        setHydrationState("error");

        return {
          draft: null,
          imageAssets: [],
        };
      }
    }, []);

  const clearStoredDraft = useCallback(async () => {
    await clearActiveDraft();
  }, []);

  useEffect(() => {
    if (!isReadyToPersist) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistRecentImages(imageAssets).catch(() => {
        // Persistence is best-effort; editing should continue.
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [imageAssets, isReadyToPersist]);

  useEffect(() => {
    if (!isReadyToPersist) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistActiveDraft({
        currentPage,
        document,
        imageAssets,
        overlays,
      }).catch(() => {
        // Persistence is best-effort; editing should continue.
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [currentPage, document, imageAssets, isReadyToPersist, overlays]);

  return {
    clearStoredDraft,
    hydrateLocalDraft,
    hydrationState,
  };
}

async function persistRecentImages(imageAssets: ImageAsset[]) {
  await putPersistedImageAssets(
    imageAssets.map((asset) => toPersistedImageAssetRecord(asset)),
  );
}

async function persistActiveDraft({
  currentPage,
  document,
  imageAssets,
  overlays,
}: {
  currentPage: number;
  document: LoadedPdfDocument | null;
  imageAssets: ImageAsset[];
  overlays: EditorOverlay[];
}) {
  if (!document) {
    await clearActiveDraft();
    return;
  }

  const imageAssetIds = getPersistedDraftImageAssetIds(imageAssets, overlays);

  await writeActiveDraft({
    currentPage,
    fileName: document.fileName,
    id: activeDraftKey,
    imageAssetIds,
    overlays,
    pdfBytes: document.bytes,
    updatedAt: Date.now(),
  });
}

function getPersistedDraftImageAssetIds(
  imageAssets: ImageAsset[],
  overlays: EditorOverlay[],
) {
  const referencedImageAssetIds = new Set(
    overlays
      .filter((overlay) => overlay.type === "image")
      .map((overlay) => overlay.assetId),
  );

  return imageAssets
    .filter(
      (asset) =>
        !asset.isHiddenFromRecents || referencedImageAssetIds.has(asset.id),
    )
    .map((asset) => asset.id);
}

export { useLocalDraftPersistence };
export type { LocalDraftHydrationState };

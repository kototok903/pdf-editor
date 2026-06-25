import { useCallback, useEffect, useRef, useState } from "react";

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
  areEditorHistoriesEqual,
  getHistoryImageAssetIds,
  type EditorHistoryState,
} from "@/features/editor/lib/editor-history";
import {
  createDocumentPagesForSource,
  createDocumentSource,
} from "@/features/editor/lib/document-pages";
import {
  imageAssetFromPersistedRecord,
  toPersistedImageAssetRecord,
} from "@/features/editor/lib/persisted-image-assets";
import type { Project } from "@/features/editor/lib/editor-projects";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type LocalDraftHydrationState = "idle" | "hydrating" | "hydrated" | "error";

type LocalDraftHydrationResult = {
  draft: PersistedEditorDraftRecord | null;
  imageAssets: ImageAsset[];
};

type ProjectModifiedAtCache = Map<
  string,
  { history: EditorHistoryState; lastModifiedAt: number }
>;

type UseLocalDraftPersistenceOptions = {
  activeProjectId: string | null;
  currentPage: number;
  document: LoadedPdfDocument | null;
  history: EditorHistoryState;
  imageAssets: ImageAsset[];
  isReadyToPersist: boolean;
  overlays: EditorOverlay[];
  projects: Project[];
};

function useLocalDraftPersistence({
  activeProjectId,
  currentPage,
  document,
  history,
  imageAssets,
  isReadyToPersist,
  overlays,
  projects,
}: UseLocalDraftPersistenceOptions) {
  const [hydrationState, setHydrationState] =
    useState<LocalDraftHydrationState>("idle");
  const projectModifiedAtCacheRef = useRef<ProjectModifiedAtCache>(new Map());

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

  const persistLocalDraftNow = useCallback(
    async (options: { projects?: Project[] } = {}) => {
      if (!isReadyToPersist) {
        return;
      }

      await persistRecentImages(imageAssets);
      await persistActiveDraft({
        currentPage,
        document,
        history,
        activeProjectId,
        imageAssets,
        modifiedAtCache: projectModifiedAtCacheRef.current,
        projects: options.projects ?? projects,
      });
    },
    [
      activeProjectId,
      currentPage,
      document,
      history,
      imageAssets,
      isReadyToPersist,
      projects,
    ],
  );

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
        history,
        activeProjectId,
        imageAssets,
        modifiedAtCache: projectModifiedAtCacheRef.current,
        projects,
      }).catch(() => {
        // Persistence is best-effort; editing should continue.
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeProjectId,
    currentPage,
    document,
    history,
    imageAssets,
    isReadyToPersist,
    overlays,
    projects,
  ]);

  return {
    clearStoredDraft,
    hydrateLocalDraft,
    hydrationState,
    persistLocalDraftNow,
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
  history,
  activeProjectId,
  imageAssets,
  modifiedAtCache,
  projects,
}: {
  activeProjectId: string | null;
  currentPage: number;
  document: LoadedPdfDocument | null;
  history: EditorHistoryState;
  imageAssets: ImageAsset[];
  modifiedAtCache: ProjectModifiedAtCache;
  projects: Project[];
}) {
  const projectsToPersist = getProjectsToPersist({
    activeProjectId,
    currentPage,
    document,
    history,
    modifiedAtCache,
    projects,
  });

  if (projectsToPersist.length === 0) {
    await clearActiveDraft();
    return;
  }

  const imageAssetIds = getPersistedProjectImageAssetIds(
    imageAssets,
    projectsToPersist.map((project) => project.history),
  );
  const activeProject =
    projectsToPersist.find((project) => project.id === activeProjectId) ??
    projectsToPersist[0];

  await writeActiveDraft({
    activeProjectId: activeProject.id,
    currentPage: activeProject.currentPage,
    documentSources: activeProject.documentSources,
    fileName: activeProject.fileName,
    history: activeProject.history,
    id: activeDraftKey,
    imageAssetIds,
    metadata: activeProject.metadata,
    overlays: activeProject.history.present.overlays,
    originalMetadata: activeProject.originalMetadata,
    pdfBytes: activeProject.pdfBytes,
    projectId: activeProject.id,
    projects: projectsToPersist.map((project) => ({
      createdAt: project.createdAt,
      currentPage: project.currentPage,
      documentSources: project.documentSources,
      fileName: project.fileName,
      history: project.history,
      id: project.id,
      metadata: project.metadata,
      originalMetadata: project.originalMetadata,
      pageCount: project.pageCount,
      pdfBytes: project.pdfBytes,
      updatedAt: project.lastModifiedAt,
    })),
    updatedAt: activeProject.lastModifiedAt,
  });
}

function getProjectsToPersist({
  activeProjectId,
  currentPage,
  document,
  history,
  modifiedAtCache,
  projects,
}: {
  activeProjectId: string | null;
  currentPage: number;
  document: LoadedPdfDocument | null;
  history: EditorHistoryState;
  modifiedAtCache: ProjectModifiedAtCache;
  projects: Project[];
}) {
  if (!activeProjectId || !document) {
    return projects;
  }

  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;
  const fallbackDocumentSource =
    activeProject?.documentSources[0] ??
    createDocumentSource({
      bytes: document.bytes,
      fileName: document.fileName,
      pageCount: document.pageCount,
    });
  const nextDocumentSources = activeProject?.documentSources ?? [
    fallbackDocumentSource,
  ];
  const nextHistory =
    history.present.documentPages.length > 0
      ? history
      : {
          ...history,
          present: {
            ...history.present,
            documentPages: createDocumentPagesForSource(fallbackDocumentSource),
          },
        };
  const nextActiveProject: Project = {
    createdAt: activeProject?.createdAt ?? Date.now(),
    currentPage: Math.min(document.pageCount, Math.max(1, currentPage)),
    documentSources: nextDocumentSources,
    fileName: document.fileName,
    history: nextHistory,
    id: activeProjectId,
    lastModifiedAt: activeProject
      ? getProjectLastModifiedAt(activeProject, history, modifiedAtCache)
      : Date.now(),
    metadata: activeProject?.metadata,
    originalMetadata:
      activeProject?.originalMetadata ?? activeProject?.metadata,
    pageCount: document.pageCount,
    pdfBytes: document.bytes,
  };

  if (!activeProject) {
    return [...projects, nextActiveProject];
  }

  return projects.map((project) =>
    project.id === activeProjectId ? nextActiveProject : project,
  );
}

function getProjectLastModifiedAt(
  project: Project,
  nextHistory: EditorHistoryState,
  modifiedAtCache: ProjectModifiedAtCache,
) {
  if (areEditorHistoriesEqual(project.history, nextHistory)) {
    return project.lastModifiedAt;
  }

  const cachedModifiedAt = modifiedAtCache.get(project.id);

  if (cachedModifiedAt?.history === nextHistory) {
    return cachedModifiedAt.lastModifiedAt;
  }

  const lastModifiedAt = Date.now();

  modifiedAtCache.set(project.id, {
    history: nextHistory,
    lastModifiedAt,
  });

  return lastModifiedAt;
}

function getPersistedDraftImageAssetIds(
  imageAssets: ImageAsset[],
  overlays: EditorOverlay[],
  history?: EditorHistoryState,
) {
  const referencedImageAssetIds = new Set(
    overlays
      .filter(
        (overlay) => overlay.type === "image" || overlay.type === "signature",
      )
      .map((overlay) => overlay.assetId),
  );

  if (history) {
    for (const assetId of getHistoryImageAssetIds(history)) {
      referencedImageAssetIds.add(assetId);
    }
  }

  return imageAssets
    .filter(
      (asset) =>
        !asset.isHiddenFromRecents || referencedImageAssetIds.has(asset.id),
    )
    .map((asset) => asset.id);
}

function getPersistedProjectImageAssetIds(
  imageAssets: ImageAsset[],
  histories: EditorHistoryState[],
) {
  const referencedImageAssetIds = new Set<string>();

  for (const history of histories) {
    for (const assetId of getHistoryImageAssetIds(history)) {
      referencedImageAssetIds.add(assetId);
    }
  }

  return imageAssets
    .filter(
      (asset) =>
        !asset.isHiddenFromRecents || referencedImageAssetIds.has(asset.id),
    )
    .map((asset) => asset.id);
}

export {
  getPersistedDraftImageAssetIds,
  getPersistedProjectImageAssetIds,
  useLocalDraftPersistence,
};
export type { LocalDraftHydrationState };

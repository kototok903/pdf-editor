import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentWorkspace } from "@/features/editor/components/DocumentWorkspace";
import { EditorToolbar } from "@/features/editor/components/EditorToolbar";
import { LayersSidebar } from "@/features/editor/components/LayersSidebar";
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import { SidebarDragDropProvider } from "@/features/editor/components/SidebarDragDropProvider";
import {
  ClearLocalDataDialog,
  SettingsDialog,
} from "@/features/editor/components/SettingsDialog";
import type {
  EditorOverlay,
  EditorOverlayInput,
  ImageAsset,
  MarkOverlay,
  MarkOverlayPatch,
  PdfRect,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  WhiteoutOverlay,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorClipboardActions } from "@/features/editor/hooks/useEditorClipboardActions";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { useEditorKeyboardShortcuts } from "@/features/editor/hooks/useEditorKeyboardShortcuts";
import { useImageAssets } from "@/features/editor/hooks/useImageAssets";
import {
  useEditorPreferences,
  useResolvedEditorTheme,
} from "@/features/editor/hooks/useEditorPreferences";
import { useLocalDraftPersistence } from "@/features/editor/hooks/useLocalDraftPersistence";
import {
  supportedImageAcceptValue,
  supportedImageTypeListLabel,
} from "@/features/editor/lib/image-asset-utils";
import { createImageOverlayRectAtPoint } from "@/features/editor/lib/overlay-coordinate-utils";
import { readPasteIntentFromAsyncClipboard } from "@/features/editor/lib/editor-clipboard";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";
import { defaultMarkSettings } from "@/features/editor/lib/mark-definitions";
import {
  defaultTextOverlay,
  defaultWhiteoutOverlay,
} from "@/features/editor/lib/overlay-defaults";
import type { SignatureCreateInput } from "@/features/editor/components/SignatureCreateDialog";
import { getSignatureFontOption } from "@/features/editor/lib/signature-fonts";
import { rasterizeTypedSignature } from "@/features/editor/lib/signature-rasterizer";
import {
  createProject,
  removeProject,
  sortProjectsForSwitcher,
  updateProjectFromDocument,
  upsertProject,
  type Project,
} from "@/features/editor/lib/editor-projects";
import {
  createProjectPath,
  getProjectIdFromPath,
  isProjectPath,
} from "@/features/editor/lib/project-route-utils";
import {
  clearEditorPreferences,
  defaultEditorPreferences,
  maxEditorZoom,
  minEditorZoom,
  type EditorPreferences,
} from "@/features/editor/lib/editor-preferences";
import { isDocumentTextFontId } from "@/features/editor/lib/text-font-id-utils";
import {
  clearDocumentTextFonts,
  createUnavailableDocumentTextFontOptions,
  registerDocumentTextFonts,
  type DocumentTextFontMenuOption,
  type DocumentTextFontOption,
} from "@/features/editor/lib/text-fonts";
import {
  areEditorHistoriesEqual,
  createEditorHistory,
  type EditorHistoryEntry,
  type EditorHistoryState,
} from "@/features/editor/lib/editor-history";
import {
  clearEditorDraftDatabase,
  type PersistedEditorProjectRecord,
} from "@/features/editor/lib/editor-draft-db";
import { createExportFileName } from "@/features/pdf-export/lib/export-file-name";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";
import { usePdfPageSizes } from "@/features/pdf/hooks/usePdfPageSizes";
import { isDocumentFontExtractionEnabled } from "@/features/pdf/lib/pdf-font-extraction-config";
import { scalePageSizes } from "@/features/pdf/lib/pdf-page-size-utils";
import type { PageSize } from "@/features/pdf/pdf-types";

const zoomStep = 0.1;
const rootPath = "/";
type ActiveTool =
  | { type: "image"; assetId: string }
  | { type: "mark" }
  | { type: "signature"; assetId: string }
  | { type: "text" }
  | { type: "whiteout" }
  | null;

type ProjectModifiedAtCacheEntry = {
  history: EditorHistoryState;
  lastModifiedAt: number;
};

function isEmptyEditorHistory(history: EditorHistoryState) {
  return (
    history.future.length === 0 &&
    history.past.length === 0 &&
    history.present.overlays.length === 0 &&
    history.present.selectedOverlayId === null
  );
}

function AppShell() {
  const exportedFileNamesRef = useRef<Set<string>>(new Set());
  const editingOverlayIdRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const projectModifiedAtCacheRef = useRef<
    Map<string, ProjectModifiedAtCacheEntry>
  >(new Map());
  const textEditHistoryEntryRef = useRef<EditorHistoryEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isRemoveProjectDialogOpen, setIsRemoveProjectDialogOpen] =
    useState(false);
  const [isClearLocalDataDialogOpen, setIsClearLocalDataDialogOpen] =
    useState(false);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [isLocalDraftReady, setIsLocalDraftReady] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [pendingRemoveProjectId, setPendingRemoveProjectId] = useState<
    string | null
  >(null);
  const [projectModifiedAtCache, setProjectModifiedAtCache] = useState<
    Map<string, ProjectModifiedAtCacheEntry>
  >(() => new Map());
  const [projects, setProjects] = useState<Project[]>([]);
  const [routePathname, setRoutePathname] = useState(
    () => window.location.pathname,
  );
  const [routeProjectId, setRouteProjectId] = useState(() =>
    getProjectIdFromPath(window.location.pathname),
  );
  const initialRouteProjectIdRef = useRef(routeProjectId);
  const [renderedBasePageSizes, setRenderedBasePageSizes] = useState<
    Record<number, PageSize>
  >({});
  const [scrollToPageRequest, setScrollToPageRequest] = useState<{
    behavior: ScrollBehavior;
    pageNumber: number;
    requestId: number;
  } | null>(null);
  const [editorPreferences, setEditorPreferences] = useEditorPreferences();
  const [documentFontOptions, setDocumentFontOptions] = useState<
    DocumentTextFontMenuOption[]
  >([]);
  const {
    isPagesSidebarOpen,
    markDefaults,
    textDefaults,
    themeName,
    whiteoutDefaults,
    zoom,
  } = editorPreferences;
  const resolvedThemeName = useResolvedEditorTheme(themeName);
  const isDark = resolvedThemeName === "dark";
  const {
    addOverlay,
    canRedo,
    canUndo,
    clearSelection,
    commitHistoryFromBase,
    getHistoryEntrySnapshot,
    history,
    moveOverlayLayer,
    moveOverlayLayerInPage,
    overlays,
    redo,
    removeOverlay,
    replaceOverlays,
    resetHistory,
    selectOverlay,
    selectedOverlayId,
    undo,
    updateMarkOverlay,
    updateOverlayRect,
    updateOverlayRotation,
    updateTextOverlay,
    updateTextOverlayDraft,
    updateWhiteoutOverlay,
  } = useEditorOverlays();
  const {
    clearFile,
    document: loadedDocument,
    error,
    openBytes,
    openFile,
    status,
  } = usePdfDocument();
  const scannedBasePageSizes = usePdfPageSizes(loadedDocument);
  const basePageSizes = useMemo(
    () => ({
      ...scannedBasePageSizes,
      ...renderedBasePageSizes,
    }),
    [renderedBasePageSizes, scannedBasePageSizes],
  );
  const pageSizes = useMemo(
    () => scalePageSizes(basePageSizes, zoom),
    [basePageSizes, zoom],
  );
  const {
    addImageBlob,
    addImageFile,
    addImageUrl,
    addSignatureBlob,
    hideImageAssetFromRecents,
    imageAssets,
    replaceImageAssets,
    recentImageAssets,
    recentSignatureAssets,
    showImageAssetInRecents,
  } = useImageAssets();
  const overlaysByPage = useStableOverlaysByPage(overlays);
  const imageAssetById = useMemo(
    () => createImageAssetMap(imageAssets),
    [imageAssets],
  );
  const currentPageOverlays =
    overlaysByPage.get(currentPage) ?? emptyEditorOverlays;
  const currentPageLayerOverlays = useMemo(
    () => getPageLayerOverlays(currentPageOverlays, currentPage),
    [currentPage, currentPageOverlays],
  );
  const { clearStoredDraft, hydrateLocalDraft, persistLocalDraftNow } =
    useLocalDraftPersistence({
      activeProjectId,
      currentPage,
      document: loadedDocument,
      history,
      imageAssets,
      isReadyToPersist: isLocalDraftReady,
      overlays,
      projects,
    });

  const selectedTextOverlay = useMemo(
    () =>
      overlays.find(
        (overlay): overlay is TextOverlay =>
          overlay.id === selectedOverlayId && overlay.type === "text",
      ) ?? null,
    [overlays, selectedOverlayId],
  );
  const selectedMarkOverlay = useMemo(
    () =>
      overlays.find(
        (overlay): overlay is MarkOverlay =>
          overlay.id === selectedOverlayId && overlay.type === "mark",
      ) ?? null,
    [overlays, selectedOverlayId],
  );
  const selectedWhiteoutOverlay = useMemo(
    () =>
      overlays.find(
        (overlay): overlay is WhiteoutOverlay =>
          overlay.id === selectedOverlayId && overlay.type === "whiteout",
      ) ?? null,
    [overlays, selectedOverlayId],
  );
  const selectedOverlay = useMemo(
    () => overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null,
    [overlays, selectedOverlayId],
  );
  const selectedOverlayPageNumber = selectedOverlay?.pageNumber ?? null;

  const currentTextSettings = selectedTextOverlay ?? textDefaults;
  const currentMarkSettings = selectedMarkOverlay ?? markDefaults;
  const currentWhiteoutSettings = selectedWhiteoutOverlay ?? whiteoutDefaults;
  const isMarkSettingsDefault =
    currentMarkSettings.color === defaultMarkSettings.color &&
    currentMarkSettings.markType === defaultMarkSettings.markType;
  const isTextSettingsDefault =
    currentTextSettings.color === defaultTextOverlay.color &&
    currentTextSettings.fontId === defaultTextOverlay.fontId &&
    currentTextSettings.fontSize === defaultTextOverlay.fontSize;
  const isWhiteoutSettingsDefault =
    currentWhiteoutSettings.color === defaultWhiteoutOverlay.color;

  const updateEditorPreferences = useCallback(
    (patch: Partial<EditorPreferences>) => {
      setEditorPreferences((currentPreferences) => ({
        ...currentPreferences,
        ...patch,
      }));
    },
    [setEditorPreferences],
  );

  useEffect(() => {
    globalThis.document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const replaceProjectPath = useCallback((projectId: string | null) => {
    const nextPath = projectId ? createProjectPath(projectId) : rootPath;

    if (window.location.pathname === nextPath) {
      setRoutePathname(nextPath);
      setRouteProjectId(projectId);
      return;
    }

    window.history.replaceState(null, "", nextPath);
    setRoutePathname(nextPath);
    setRouteProjectId(projectId);
  }, []);

  const pushProjectPath = useCallback((projectId: string | null) => {
    const nextPath = projectId ? createProjectPath(projectId) : rootPath;

    if (window.location.pathname === nextPath) {
      setRoutePathname(nextPath);
      setRouteProjectId(projectId);
      return;
    }

    window.history.pushState(null, "", nextPath);
    setRoutePathname(nextPath);
    setRouteProjectId(projectId);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextPathname = window.location.pathname;

      setRoutePathname(nextPathname);
      setRouteProjectId(getProjectIdFromPath(nextPathname));
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    clearDocumentTextFonts();

    if (!loadedDocument || !isDocumentFontExtractionEnabled) {
      return;
    }

    const abortController = new AbortController();

    const loadDocumentFonts = async () => {
      const { extractPdfFonts, getAvailablePdfFonts, getUnavailablePdfFonts } =
        await import("@/features/pdf/lib/pdf-font-extraction");
      const extractedFonts = await extractPdfFonts({
        pageCount: loadedDocument.pageCount,
        pdfDocument: loadedDocument.pdfDocument,
        signal: abortController.signal,
      });

      if (abortController.signal.aborted) {
        return;
      }

      const registeredFonts = await registerDocumentTextFonts(
        getAvailablePdfFonts(extractedFonts).map((font) => ({
          bytes: font.bytes,
          displayName: font.displayName,
          fontName: font.fontName,
          mimetype: font.mimetype,
          supportedCodePoints: font.supportedCodePoints,
        })),
      );
      const unavailableFonts = createUnavailableDocumentTextFontOptions(
        getUnavailablePdfFonts(extractedFonts),
      );

      if (abortController.signal.aborted) {
        clearDocumentTextFonts();
        return;
      }

      setDocumentFontOptions([...registeredFonts, ...unavailableFonts]);
    };

    void loadDocumentFonts().catch(() => {
      if (!abortController.signal.aborted) {
        clearDocumentTextFonts();
        setDocumentFontOptions([]);
      }
    });

    return () => {
      abortController.abort();
      clearDocumentTextFonts();
    };
  }, [loadedDocument]);

  useEffect(() => {
    let isCancelled = false;

    const restoreLocalDraft = async () => {
      const restoredDraft = await hydrateLocalDraft();
      const initialRouteProjectId = initialRouteProjectIdRef.current;

      if (isCancelled) {
        for (const asset of restoredDraft.imageAssets) {
          URL.revokeObjectURL(asset.objectUrl);
        }

        return;
      }

      if (restoredDraft.imageAssets.length > 0) {
        replaceImageAssets(restoredDraft.imageAssets);
      }

      if (restoredDraft.draft) {
        const restoredProjects =
          restoredDraft.draft.projects?.map(createProjectFromPersistedRecord) ??
          [];

        if (restoredProjects.length > 0) {
          setProjects(restoredProjects);

          const targetProject = initialRouteProjectId
            ? (restoredProjects.find(
                (project) => project.id === initialRouteProjectId,
              ) ?? null)
            : null;

          if (!targetProject) {
            setActiveProjectId(null);
            clearFile();
            resetHistory();
          } else {
            const restoredDocument = await openBytes(
              targetProject.pdfBytes,
              targetProject.fileName,
            );

            if (isCancelled) {
              return;
            }

            if (restoredDocument) {
              const restoredCurrentPage = Math.min(
                restoredDocument.pageCount,
                Math.max(1, targetProject.currentPage),
              );

              resetHistory([], null, targetProject.history);
              setCurrentPage(restoredCurrentPage);
              setScrollToPageRequest((currentRequest) => ({
                behavior: "auto",
                pageNumber: restoredCurrentPage,
                requestId: (currentRequest?.requestId ?? 0) + 1,
              }));
              setActiveProjectId(targetProject.id);
            } else {
              toast.error("Unable to restore project", {
                description: "The saved local project could not be opened.",
              });
            }
          }
        } else {
          const restoredDocument = await openBytes(
            restoredDraft.draft.pdfBytes,
            restoredDraft.draft.fileName,
          );

          if (isCancelled) {
            return;
          }

          if (restoredDocument) {
            const restoredHistory =
              restoredDraft.draft.history ??
              createEditorHistory(restoredDraft.draft.overlays);
            resetHistory([], null, restoredHistory);
            const restoredCurrentPage = Math.min(
              restoredDocument.pageCount,
              Math.max(1, restoredDraft.draft.currentPage),
            );
            setCurrentPage(restoredCurrentPage);
            setScrollToPageRequest((currentRequest) => ({
              behavior: "auto",
              pageNumber: restoredCurrentPage,
              requestId: (currentRequest?.requestId ?? 0) + 1,
            }));
            const restoredProject = createProject({
              currentPage: restoredCurrentPage,
              document: restoredDocument,
              history: restoredHistory,
              id:
                restoredDraft.draft.projectId ??
                initialRouteProjectId ??
                undefined,
              now: restoredDraft.draft.updatedAt,
            });
            setProjects([restoredProject]);
            if (initialRouteProjectId === restoredProject.id) {
              setActiveProjectId(restoredProject.id);
            } else {
              setActiveProjectId(null);
              clearFile();
              resetHistory();
            }
          } else {
            try {
              await clearStoredDraft();
            } catch {
              // The restore path already failed; keep the editor usable.
            }

            toast.error("Unable to restore project", {
              description: "The saved local project was removed.",
            });
          }
        }
      }

      if (!isCancelled) {
        setIsLocalDraftReady(true);
      }
    };

    void restoreLocalDraft();

    return () => {
      isCancelled = true;
    };
  }, [
    clearStoredDraft,
    clearFile,
    hydrateLocalDraft,
    openBytes,
    replaceImageAssets,
    replaceProjectPath,
    resetHistory,
  ]);

  const activeImageAsset =
    activeTool?.type === "image"
      ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
      : null;
  const activeSignatureAsset =
    activeTool?.type === "signature"
      ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
      : null;
  const missingProjectId =
    isLocalDraftReady &&
    routeProjectId &&
    routeProjectId !== activeProjectId &&
    !projects.some((project) => project.id === routeProjectId)
      ? routeProjectId
      : null;
  const displayStatus =
    !isLocalDraftReady && status === "empty" ? "loading" : status;

  const handleClearActiveTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  useEffect(() => {
    editingOverlayIdRef.current = editingOverlayId;

    if (editingOverlayId && !textEditHistoryEntryRef.current) {
      textEditHistoryEntryRef.current = getHistoryEntrySnapshot();
    }
  }, [editingOverlayId, getHistoryEntrySnapshot]);

  const commitPendingTextEdit = useCallback(() => {
    const baseEntry = textEditHistoryEntryRef.current;

    if (!baseEntry) {
      return;
    }

    textEditHistoryEntryRef.current = null;
    commitHistoryFromBase(baseEntry);
  }, [commitHistoryFromBase]);

  const handleEditOverlay = useCallback(
    (overlayId: string | null) => {
      const currentEditingOverlayId = editingOverlayIdRef.current;

      if (currentEditingOverlayId && currentEditingOverlayId !== overlayId) {
        commitPendingTextEdit();
      }

      editingOverlayIdRef.current = overlayId;
      setEditingOverlayId(overlayId);
    },
    [commitPendingTextEdit],
  );

  const handleClearSelection = useCallback(() => {
    commitPendingTextEdit();
    clearSelection();
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);
  }, [clearSelection, commitPendingTextEdit]);

  const getCurrentPageSize = useCallback(() => {
    const pageSize = pageSizes[currentPage];

    if (!pageSize) {
      return null;
    }

    return {
      height: pageSize.height / zoom,
      width: pageSize.width / zoom,
    };
  }, [currentPage, pageSizes, zoom]);

  const getCurrentTextDefaults = useCallback(
    (): TextOverlayDefaults => ({
      color: currentTextSettings.color,
      fontId: currentTextSettings.fontId,
      fontSize: currentTextSettings.fontSize,
      text: defaultTextOverlay.text,
    }),
    [
      currentTextSettings.color,
      currentTextSettings.fontId,
      currentTextSettings.fontSize,
    ],
  );

  const addRenderableOverlay = useCallback(
    (
      input: EditorOverlayInput,
      options?: { additionalRenderableImageAssetIds?: string[] },
    ) => {
      if (
        (input.type === "image" || input.type === "signature") &&
        !imageAssets.some((asset) => asset.id === input.assetId) &&
        !options?.additionalRenderableImageAssetIds?.includes(input.assetId)
      ) {
        return null;
      }

      setActiveTool(null);
      handleEditOverlay(null);

      if (input.type === "image" || input.type === "signature") {
        showImageAssetInRecents(input.assetId);
      }

      return addOverlay(input);
    },
    [addOverlay, handleEditOverlay, imageAssets, showImageAssetInRecents],
  );

  const {
    clearClipboardHistory,
    handleCopySelectedOverlay,
    handleDuplicateSelectedOverlay,
    handlePasteEvent,
    handlePasteWithCurrentTextSettings,
  } = useEditorClipboardActions({
    addImageBlob,
    addSignatureBlob,
    addRenderableOverlay,
    currentPage,
    getCurrentPageSize,
    getCurrentTextDefaults,
    imageAssets,
    overlays,
    pageSizes,
    selectedOverlay,
    zoom,
  });

  const handleUndo = useCallback(() => {
    commitPendingTextEdit();
    undo();
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);
    setActiveTool(null);
  }, [commitPendingTextEdit, undo]);

  const handleRedo = useCallback(() => {
    commitPendingTextEdit();
    redo();
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);
    setActiveTool(null);
  }, [commitPendingTextEdit, redo]);

  useEditorKeyboardShortcuts({
    editingOverlayId,
    hasActiveTool: activeTool !== null,
    onClearActiveTool: handleClearActiveTool,
    onClearSelection: handleClearSelection,
    onCopySelectedOverlay: handleCopySelectedOverlay,
    onDuplicateSelectedOverlay: handleDuplicateSelectedOverlay,
    onEditOverlay: handleEditOverlay,
    onMoveSelectedOverlayLayer: moveOverlayLayerInPage,
    onPasteEvent: handlePasteEvent,
    onPasteWithCurrentTextSettings: handlePasteWithCurrentTextSettings,
    onRedo: handleRedo,
    onRemoveOverlay: removeOverlay,
    onUndo: handleUndo,
    onUpdateOverlayRect: updateOverlayRect,
    pageSizes: basePageSizes,
    scale: zoom,
    selectedOverlay,
  });

  const handleOpenFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetProjectRuntimeState = useCallback(() => {
    clearClipboardHistory();
    textEditHistoryEntryRef.current = null;
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);
    setActiveTool(null);
    setRenderedBasePageSizes({});
    setScrollToPageRequest(null);
    clearDocumentTextFonts();
    setDocumentFontOptions([]);
    setEditorPreferences((currentPreferences) =>
      isDocumentTextFontId(currentPreferences.textDefaults.fontId)
        ? {
            ...currentPreferences,
            textDefaults: {
              ...currentPreferences.textDefaults,
              fontId: defaultTextOverlay.fontId,
            },
          }
        : currentPreferences,
    );
    exportedFileNamesRef.current = new Set();
  }, [clearClipboardHistory, setEditorPreferences]);

  const isProjectViewCleared =
    !activeProjectId &&
    !loadedDocument &&
    status === "empty" &&
    currentPage === 1 &&
    isEmptyEditorHistory(history);

  const clearActiveProjectView = useCallback(() => {
    if (isProjectViewCleared) {
      return;
    }

    setActiveProjectId(null);

    if (currentPage !== 1) {
      setCurrentPage(1);
    }

    if (loadedDocument || status !== "empty") {
      clearFile();
    }

    if (!isEmptyEditorHistory(history)) {
      resetHistory();
    }

    resetProjectRuntimeState();
  }, [
    clearFile,
    currentPage,
    history,
    isProjectViewCleared,
    loadedDocument,
    resetHistory,
    resetProjectRuntimeState,
    status,
  ]);

  const getProjectLastModifiedAt = useCallback(
    (project: Project, nextHistory: EditorHistoryState) => {
      if (areEditorHistoriesEqual(project.history, nextHistory)) {
        return project.lastModifiedAt;
      }

      const cachedModifiedAt = projectModifiedAtCacheRef.current.get(
        project.id,
      );

      if (cachedModifiedAt?.history === nextHistory) {
        return cachedModifiedAt.lastModifiedAt;
      }

      const lastModifiedAt = Date.now();

      projectModifiedAtCacheRef.current.set(project.id, {
        history: nextHistory,
        lastModifiedAt,
      });

      return lastModifiedAt;
    },
    [],
  );

  const getActiveProjectSnapshot = useCallback(() => {
    if (!activeProjectId || !loadedDocument) {
      return null;
    }

    const currentProject =
      projects.find((project) => project.id === activeProjectId) ??
      createProject({
        currentPage,
        document: loadedDocument,
        history,
        id: activeProjectId,
      });

    return updateProjectFromDocument(currentProject, {
      currentPage,
      document: loadedDocument,
      history,
      lastModifiedAt: getProjectLastModifiedAt(currentProject, history),
    });
  }, [
    activeProjectId,
    currentPage,
    getProjectLastModifiedAt,
    history,
    loadedDocument,
    projects,
  ]);

  useEffect(() => {
    if (!activeProjectId || !loadedDocument) {
      return;
    }

    const currentProject =
      projects.find((project) => project.id === activeProjectId) ?? null;

    if (
      !currentProject ||
      areEditorHistoriesEqual(currentProject.history, history)
    ) {
      return;
    }

    setProjectModifiedAtCache((currentCache) => {
      const cachedModifiedAt = currentCache.get(activeProjectId);

      if (cachedModifiedAt?.history === history) {
        return currentCache;
      }

      const nextCache = new Map(currentCache);
      const nextEntry = {
        history,
        lastModifiedAt: Date.now(),
      };

      nextCache.set(activeProjectId, nextEntry);
      projectModifiedAtCacheRef.current.set(activeProjectId, nextEntry);

      return nextCache;
    });
  }, [activeProjectId, history, loadedDocument, projects]);

  const activateProject = useCallback(
    async (
      project: Project,
      options: { pathUpdate?: "none" | "push" | "replace" } = {},
    ) => {
      setCurrentPage(1);
      resetHistory();
      resetProjectRuntimeState();
      setActiveProjectId(project.id);

      const restoredDocument = await openBytes(
        project.pdfBytes,
        project.fileName,
      );

      if (!restoredDocument) {
        setActiveProjectId(null);
        return false;
      }

      const restoredCurrentPage = Math.min(
        restoredDocument.pageCount,
        Math.max(1, project.currentPage),
      );

      resetHistory([], null, project.history);
      setCurrentPage(restoredCurrentPage);
      setScrollToPageRequest((currentRequest) => ({
        behavior: "auto",
        pageNumber: restoredCurrentPage,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));

      if (options.pathUpdate === "push") {
        pushProjectPath(project.id);
      } else if (options.pathUpdate === "replace") {
        replaceProjectPath(project.id);
      }

      return true;
    },
    [
      openBytes,
      pushProjectPath,
      replaceProjectPath,
      resetHistory,
      resetProjectRuntimeState,
    ],
  );

  const openPdfAsProject = useCallback(
    async (file: File) => {
      commitPendingTextEdit();
      const previousProject = getActiveProjectSnapshot();

      if (previousProject) {
        setProjects((currentProjects) =>
          upsertProject(currentProjects, previousProject),
        );
      }

      setCurrentPage(1);
      resetHistory();
      resetProjectRuntimeState();

      const openedDocument = await openFile(file);

      if (!openedDocument) {
        if (previousProject) {
          await activateProject(previousProject);
        }

        return;
      }

      const project = createProject({
        document: openedDocument,
        history: createEditorHistory(),
      });

      setProjects((currentProjects) =>
        upsertProject(
          previousProject
            ? upsertProject(currentProjects, previousProject)
            : currentProjects,
          project,
        ),
      );
      setActiveProjectId(project.id);
      pushProjectPath(project.id);
      setCurrentPage(1);
      resetHistory();
    },
    [
      activateProject,
      commitPendingTextEdit,
      getActiveProjectSnapshot,
      openFile,
      pushProjectPath,
      resetHistory,
      resetProjectRuntimeState,
    ],
  );

  const handleRequestRemoveProject = useCallback((projectId: string) => {
    setPendingRemoveProjectId(projectId);
    setIsRemoveProjectDialogOpen(true);
  }, []);

  const handleCloseActiveProject = useCallback(() => {
    commitPendingTextEdit();
    const activeSnapshot = getActiveProjectSnapshot();

    if (activeSnapshot) {
      setProjects((currentProjects) =>
        upsertProject(currentProjects, activeSnapshot),
      );
    }

    setActiveProjectId(null);
    pushProjectPath(null);
    setCurrentPage(1);
    clearFile();
    resetHistory();
    resetProjectRuntimeState();
  }, [
    clearFile,
    commitPendingTextEdit,
    getActiveProjectSnapshot,
    pushProjectPath,
    resetHistory,
    resetProjectRuntimeState,
  ]);

  const handleRemoveProject = useCallback(
    (projectId: string) => {
      handleRequestRemoveProject(projectId);
    },
    [handleRequestRemoveProject],
  );

  const handleConfirmRemoveProject = useCallback(() => {
    setIsRemoveProjectDialogOpen(false);
    commitPendingTextEdit();

    const activeSnapshot = getActiveProjectSnapshot();
    const currentProjects = activeSnapshot
      ? upsertProject(projects, activeSnapshot)
      : projects;
    const projectIdToRemove = pendingRemoveProjectId;
    const nextProjects = projectIdToRemove
      ? removeProject(currentProjects, projectIdToRemove)
      : currentProjects;
    const isRemovingActiveProject =
      Boolean(projectIdToRemove) && projectIdToRemove === activeProjectId;

    setProjects(nextProjects);
    setPendingRemoveProjectId(null);

    if (!isRemovingActiveProject) {
      return;
    }

    setActiveProjectId(null);
    replaceProjectPath(null);
    setCurrentPage(1);
    clearFile();
    resetHistory();
    resetProjectRuntimeState();

    if (nextProjects.length === 0) {
      void clearStoredDraft().catch(() => {
        // Removing the visible project should not be blocked by storage errors.
      });
    }
  }, [
    activeProjectId,
    clearFile,
    clearStoredDraft,
    commitPendingTextEdit,
    getActiveProjectSnapshot,
    pendingRemoveProjectId,
    projects,
    replaceProjectPath,
    resetHistory,
    resetProjectRuntimeState,
  ]);

  useEffect(() => {
    if (!isLocalDraftReady) {
      return;
    }

    if (status === "loading") {
      return;
    }

    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) {
        return;
      }

      if (!routeProjectId && !isProjectPath(routePathname)) {
        if (activeProjectId) {
          const activeSnapshot = getActiveProjectSnapshot();

          if (activeSnapshot) {
            setProjects((currentProjects) =>
              upsertProject(currentProjects, activeSnapshot),
            );
          }
        }

        clearActiveProjectView();
        return;
      }

      if (routeProjectId === activeProjectId) {
        return;
      }

      if (!routeProjectId) {
        clearActiveProjectView();
        return;
      }

      const targetProject = projects.find(
        (project) => project.id === routeProjectId,
      );

      if (!targetProject) {
        clearActiveProjectView();
        return;
      }

      const activeSnapshot = getActiveProjectSnapshot();

      if (activeSnapshot) {
        setProjects((currentProjects) =>
          upsertProject(currentProjects, activeSnapshot),
        );
      }

      void activateProject(targetProject, { pathUpdate: "none" });
    });

    return () => {
      isCancelled = true;
    };
  }, [
    activeProjectId,
    activateProject,
    clearActiveProjectView,
    getActiveProjectSnapshot,
    isLocalDraftReady,
    projects,
    routePathname,
    routeProjectId,
    status,
  ]);

  const toolbarProjects = useMemo(() => {
    if (!activeProjectId || !loadedDocument) {
      return sortProjectsForSwitcher(projects, activeProjectId);
    }

    const existingProject =
      projects.find((project) => project.id === activeProjectId) ?? null;
    const baseProject =
      existingProject ??
      createProject({
        currentPage,
        document: loadedDocument,
        history,
        id: activeProjectId,
      });
    const cachedModifiedAt = projectModifiedAtCache.get(baseProject.id);
    const activeProject = updateProjectFromDocument(baseProject, {
      currentPage,
      document: loadedDocument,
      history,
      lastModifiedAt:
        cachedModifiedAt?.history === history
          ? cachedModifiedAt.lastModifiedAt
          : baseProject.lastModifiedAt,
    });

    return sortProjectsForSwitcher(
      upsertProject(projects, activeProject),
      activeProjectId,
    );
  }, [
    activeProjectId,
    currentPage,
    history,
    loadedDocument,
    projectModifiedAtCache,
    projects,
  ]);

  const pendingRemoveProjectFileName = useMemo(() => {
    if (!pendingRemoveProjectId) {
      return null;
    }

    return (
      toolbarProjects.find((project) => project.id === pendingRemoveProjectId)
        ?.fileName ?? null
    );
  }, [pendingRemoveProjectId, toolbarProjects]);

  const handleSelectProject = useCallback(
    (projectId: string) => {
      if (projectId === activeProjectId) {
        return;
      }

      commitPendingTextEdit();
      const activeSnapshot = getActiveProjectSnapshot();
      const currentProjects = activeSnapshot
        ? upsertProject(projects, activeSnapshot)
        : projects;
      const targetProject = currentProjects.find(
        (project) => project.id === projectId,
      );

      if (!targetProject) {
        return;
      }

      setProjects(currentProjects);
      pushProjectPath(projectId);
    },
    [
      activeProjectId,
      commitPendingTextEdit,
      getActiveProjectSnapshot,
      pushProjectPath,
      projects,
    ],
  );

  const handleOpenProjectInNewTab = useCallback(
    async (projectId: string) => {
      commitPendingTextEdit();

      const activeSnapshot = getActiveProjectSnapshot();
      const currentProjects = activeSnapshot
        ? upsertProject(projects, activeSnapshot)
        : projects;
      const targetProject = currentProjects.find(
        (project) => project.id === projectId,
      );

      if (!targetProject) {
        return;
      }

      const newTab = window.open("about:blank", "_blank");

      if (!newTab) {
        toast.error("Unable to open project", {
          description: "Your browser blocked the new tab.",
        });
        return;
      }

      newTab.opener = null;
      setProjects(currentProjects);

      try {
        await persistLocalDraftNow({ projects: currentProjects });
        newTab.location.replace(createProjectPath(projectId));
      } catch {
        newTab.close();
        toast.error("Unable to open project", {
          description: "The latest local edits could not be saved first.",
        });
      }
    },
    [
      commitPendingTextEdit,
      getActiveProjectSnapshot,
      persistLocalDraftNow,
      projects,
    ],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    void openPdfAsProject(file);
  };

  const handleExportPdf = useCallback(async () => {
    if (!loadedDocument || isExporting) {
      return;
    }

    commitPendingTextEdit();
    setIsExporting(true);
    editingOverlayIdRef.current = null;
    setEditingOverlayId(null);

    try {
      const fileName = createExportFileName(
        loadedDocument.fileName,
        exportedFileNamesRef.current,
      );
      const { exportPdf } =
        await import("@/features/pdf-export/lib/export-pdf");
      const exportedBytes = await exportPdf({
        documentFonts: documentFontOptions.filter(
          (fontOption): fontOption is DocumentTextFontOption =>
            fontOption.isAvailable,
        ),
        imageAssets,
        originalPdfBytes: loadedDocument.bytes,
        overlays,
      });

      downloadBytes(exportedBytes, fileName);
      exportedFileNamesRef.current.add(fileName);
      toast.success("Exported PDF", {
        description: fileName,
      });
    } catch (error) {
      toast.error("Unable to export PDF", {
        description: getExportErrorMessage(error),
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    commitPendingTextEdit,
    documentFontOptions,
    imageAssets,
    isExporting,
    loadedDocument,
    overlays,
  ]);

  const handleOpenImageDialog = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    void addImageFile(file).then((asset) => {
      setActiveTool({ assetId: asset.id, type: "image" });
      handleEditOverlay(null);
    });
  };

  const handleImportImageUrl = useCallback(
    async (url: string) => {
      const asset = await addImageUrl(url);

      setActiveTool({ assetId: asset.id, type: "image" });
      handleEditOverlay(null);
    },
    [addImageUrl, handleEditOverlay],
  );

  const handleCreateSignature = useCallback(
    async (input: SignatureCreateInput) => {
      try {
        const signatureBlob =
          input.type === "typed"
            ? await rasterizeTypedSignature({
                color: input.color,
                font: getSignatureFontOption(input.fontId),
                text: input.text,
              }).then(({ blob }) => blob)
            : input.blob;
        const signatureName =
          input.type === "typed" ? `${input.text}.png` : "Signature.png";
        const asset = await addSignatureBlob(signatureBlob, signatureName);

        setActiveTool({ assetId: asset.id, type: "signature" });
        handleEditOverlay(null);
        toast.success("Created signature", {
          description: "Click a page to place it.",
        });

        return true;
      } catch (error) {
        toast.error("Unable to create signature", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });

        return false;
      }
    },
    [addSignatureBlob, handleEditOverlay],
  );

  const handleImportImageFromClipboard = useCallback(() => {
    const importImageFromClipboard = async () => {
      try {
        const intent = await readPasteIntentFromAsyncClipboard();
        const blob =
          intent.kind === "external-image"
            ? intent.blob
            : intent.kind === "overlay"
              ? intent.imageBlob
              : null;

        if (!blob) {
          toast.error("Copy an image and try again", {
            description: `Supported types: ${supportedImageTypeListLabel}`,
          });
          return;
        }

        const asset = await addImageBlob(blob);

        setActiveTool({ assetId: asset.id, type: "image" });
        handleEditOverlay(null);
      } catch (error) {
        toast.error("Unable to read clipboard", {
          description:
            error instanceof Error
              ? error.message
              : "Allow clipboard access and try again.",
        });
      }
    };

    void importImageFromClipboard();
  }, [addImageBlob, handleEditOverlay]);

  const handleDropPdfFile = useCallback(
    (file: File) => {
      void openPdfAsProject(file);
    },
    [openPdfAsProject],
  );

  const handleDropImageFile = useCallback(
    (file: File) => {
      const pageSize = getCurrentPageSize();

      if (!pageSize) {
        toast.error("Unable to place image", {
          description: "Open a PDF and wait for the page to finish rendering.",
        });
        return;
      }

      const importAndPlaceImage = async () => {
        try {
          const asset = await addImageFile(file);

          addRenderableOverlay(
            {
              assetId: asset.id,
              pageNumber: currentPage,
              rect: createImageOverlayRectAtPoint(
                { x: pageSize.width / 2, y: pageSize.height / 2 },
                pageSize,
                asset,
              ),
              rotationDegrees: 0,
              sha256Signature: asset.sha256Signature,
              type: "image",
            },
            { additionalRenderableImageAssetIds: [asset.id] },
          );
        } catch (error) {
          toast.error("Unable to import image", {
            description:
              error instanceof Error
                ? error.message
                : "Please try another image file.",
          });
        }
      };

      void importAndPlaceImage();
    },
    [addImageFile, addRenderableOverlay, currentPage, getCurrentPageSize],
  );

  const handlePageSizeChange = useCallback(
    (pageNumber: number, pageSize: PageSize) => {
      setRenderedBasePageSizes((currentPageSizes) => ({
        ...currentPageSizes,
        [pageNumber]: {
          height: pageSize.height / zoom,
          width: pageSize.width / zoom,
        },
      }));
    },
    [zoom],
  );

  const handleTextToolClick = useCallback(() => {
    setActiveTool((currentTool) =>
      currentTool?.type === "text" ? null : { type: "text" },
    );
    handleEditOverlay(null);
  }, [handleEditOverlay]);

  const handleMarkToolClick = useCallback(() => {
    setActiveTool((currentTool) =>
      currentTool?.type === "mark" ? null : { type: "mark" },
    );
    handleEditOverlay(null);
  }, [handleEditOverlay]);

  const handleMarkToolActivate = useCallback(() => {
    setActiveTool({ type: "mark" });
    handleEditOverlay(null);
  }, [handleEditOverlay]);

  const handleWhiteoutToolClick = useCallback(() => {
    setActiveTool((currentTool) =>
      currentTool?.type === "whiteout" ? null : { type: "whiteout" },
    );
    handleEditOverlay(null);
  }, [handleEditOverlay]);

  const handlePlaceTextOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      setCurrentPage(pageNumber);
      const overlay = addOverlay({
        ...textDefaults,
        pageNumber,
        rect,
        type: "text",
      });
      setActiveTool(null);
      handleEditOverlay(overlay.id);
    },
    [addOverlay, handleEditOverlay, textDefaults],
  );

  const handlePlaceMarkOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      setCurrentPage(pageNumber);
      addOverlay({
        ...markDefaults,
        pageNumber,
        rect,
        type: "mark",
      });
      setActiveTool(null);
      handleEditOverlay(null);
    },
    [addOverlay, handleEditOverlay, markDefaults],
  );

  const handlePlaceImageOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      if (!activeImageAsset) {
        return;
      }

      setCurrentPage(pageNumber);
      addOverlay({
        assetId: activeImageAsset.id,
        pageNumber,
        rect,
        rotationDegrees: 0,
        sha256Signature: activeImageAsset.sha256Signature,
        type: "image",
      });
      setActiveTool(null);
      handleEditOverlay(null);
    },
    [activeImageAsset, addOverlay, handleEditOverlay],
  );

  const handlePlaceSignatureOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      if (!activeSignatureAsset) {
        return;
      }

      setCurrentPage(pageNumber);
      addOverlay({
        assetId: activeSignatureAsset.id,
        pageNumber,
        rect,
        rotationDegrees: 0,
        sha256Signature: activeSignatureAsset.sha256Signature,
        type: "signature",
      });
      setActiveTool(null);
      handleEditOverlay(null);
    },
    [activeSignatureAsset, addOverlay, handleEditOverlay],
  );

  const handlePlaceWhiteoutOverlay = useCallback(
    (pageNumber: number, rect: PdfRect) => {
      setCurrentPage(pageNumber);
      addOverlay({
        color: currentWhiteoutSettings.color,
        pageNumber,
        rect,
        type: "whiteout",
      });
      setActiveTool(null);
      handleEditOverlay(null);
    },
    [addOverlay, currentWhiteoutSettings.color, handleEditOverlay],
  );

  const handleMarkSettingsChange = useCallback(
    (patch: MarkOverlayPatch) => {
      setEditorPreferences((currentPreferences) => {
        const nextMarkDefaults = getNextMarkSettings(
          currentPreferences.markDefaults,
          patch,
        );

        if (nextMarkDefaults === currentPreferences.markDefaults) {
          return currentPreferences;
        }

        return {
          ...currentPreferences,
          markDefaults: nextMarkDefaults,
        };
      });

      if (
        selectedMarkOverlay &&
        !isMarkSettingsPatchNoop(selectedMarkOverlay, patch)
      ) {
        updateMarkOverlay(selectedMarkOverlay.id, patch);
      }
    },
    [selectedMarkOverlay, setEditorPreferences, updateMarkOverlay],
  );

  const handleMarkSettingsReset = useCallback(() => {
    setEditorPreferences((currentPreferences) => {
      if (
        areMarkSettingsEqual(
          currentPreferences.markDefaults,
          defaultMarkSettings,
        )
      ) {
        return currentPreferences;
      }

      return {
        ...currentPreferences,
        markDefaults: defaultMarkSettings,
      };
    });

    if (
      selectedMarkOverlay &&
      !areMarkSettingsEqual(selectedMarkOverlay, defaultMarkSettings)
    ) {
      updateMarkOverlay(selectedMarkOverlay.id, defaultMarkSettings);
    }
  }, [selectedMarkOverlay, setEditorPreferences, updateMarkOverlay]);

  const handleTextSettingsChange = useCallback(
    (patch: TextOverlayPatch) => {
      setEditorPreferences((currentPreferences) => {
        const nextTextDefaults = getNextTextSettings(
          currentPreferences.textDefaults,
          patch,
        );

        if (nextTextDefaults === currentPreferences.textDefaults) {
          return currentPreferences;
        }

        return {
          ...currentPreferences,
          textDefaults: nextTextDefaults,
        };
      });

      if (
        selectedTextOverlay &&
        !isTextSettingsPatchNoop(selectedTextOverlay, patch)
      ) {
        commitPendingTextEdit();
        updateTextOverlay(selectedTextOverlay.id, patch);
      }
    },
    [
      commitPendingTextEdit,
      selectedTextOverlay,
      setEditorPreferences,
      updateTextOverlay,
    ],
  );

  const handleTextSettingsReset = useCallback(() => {
    const defaultTextPatch = {
      color: defaultTextOverlay.color,
      fontId: defaultTextOverlay.fontId,
      fontSize: defaultTextOverlay.fontSize,
    };

    setEditorPreferences((currentPreferences) => {
      const nextTextDefaults = getNextTextSettings(
        currentPreferences.textDefaults,
        defaultTextPatch,
      );

      if (nextTextDefaults === currentPreferences.textDefaults) {
        return currentPreferences;
      }

      return {
        ...currentPreferences,
        textDefaults: nextTextDefaults,
      };
    });

    if (
      selectedTextOverlay &&
      !isTextSettingsPatchNoop(selectedTextOverlay, defaultTextPatch)
    ) {
      commitPendingTextEdit();
      updateTextOverlay(selectedTextOverlay.id, defaultTextPatch);
    }
  }, [
    commitPendingTextEdit,
    selectedTextOverlay,
    setEditorPreferences,
    updateTextOverlay,
  ]);

  const handleWhiteoutSettingsChange = useCallback(
    (patch: WhiteoutOverlayPatch) => {
      setEditorPreferences((currentPreferences) => {
        const nextWhiteoutDefaults = getNextWhiteoutSettings(
          currentPreferences.whiteoutDefaults,
          patch,
        );

        if (nextWhiteoutDefaults === currentPreferences.whiteoutDefaults) {
          return currentPreferences;
        }

        return {
          ...currentPreferences,
          whiteoutDefaults: nextWhiteoutDefaults,
        };
      });

      if (
        selectedWhiteoutOverlay &&
        !isWhiteoutSettingsPatchNoop(selectedWhiteoutOverlay, patch)
      ) {
        updateWhiteoutOverlay(selectedWhiteoutOverlay.id, patch);
      }
    },
    [selectedWhiteoutOverlay, setEditorPreferences, updateWhiteoutOverlay],
  );

  const handleWhiteoutSettingsReset = useCallback(() => {
    setEditorPreferences((currentPreferences) => {
      if (
        areWhiteoutSettingsEqual(
          currentPreferences.whiteoutDefaults,
          defaultWhiteoutOverlay,
        )
      ) {
        return currentPreferences;
      }

      return {
        ...currentPreferences,
        whiteoutDefaults: defaultWhiteoutOverlay,
      };
    });

    if (
      selectedWhiteoutOverlay &&
      !areWhiteoutSettingsEqual(selectedWhiteoutOverlay, defaultWhiteoutOverlay)
    ) {
      updateWhiteoutOverlay(selectedWhiteoutOverlay.id, defaultWhiteoutOverlay);
    }
  }, [selectedWhiteoutOverlay, setEditorPreferences, updateWhiteoutOverlay]);

  const handleSelectOverlay = useCallback(
    (overlayId: string) => {
      selectOverlay(overlayId);

      if (
        editingOverlayIdRef.current &&
        editingOverlayIdRef.current !== overlayId
      ) {
        handleEditOverlay(null);
      }
    },
    [handleEditOverlay, selectOverlay],
  );

  const handleStopEditingOverlay = useCallback(() => {
    handleEditOverlay(null);
  }, [handleEditOverlay]);

  const handleZoomIn = useCallback(() => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      zoom: Math.min(
        maxEditorZoom,
        Number((currentPreferences.zoom + zoomStep).toFixed(2)),
      ),
    }));
  }, [setEditorPreferences]);

  const handleZoomOut = useCallback(() => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      zoom: Math.max(
        minEditorZoom,
        Number((currentPreferences.zoom - zoomStep).toFixed(2)),
      ),
    }));
  }, [setEditorPreferences]);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsDialogOpen(true);
  }, []);

  const handleSelectImageAsset = useCallback(
    (assetId: string) => {
      showImageAssetInRecents(assetId);
      setActiveTool({ assetId, type: "image" });
      setEditingOverlayId(null);
    },
    [showImageAssetInRecents],
  );

  const handleSelectSignatureAsset = useCallback(
    (assetId: string) => {
      showImageAssetInRecents(assetId);
      setActiveTool({ assetId, type: "signature" });
      setEditingOverlayId(null);
    },
    [showImageAssetInRecents],
  );

  const handleToggleLayersSidebar = useCallback(() => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      isLayersSidebarOpen: !currentPreferences.isLayersSidebarOpen,
    }));
  }, [setEditorPreferences]);

  const handleTogglePagesSidebar = useCallback(() => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      isPagesSidebarOpen: !currentPreferences.isPagesSidebarOpen,
    }));
  }, [setEditorPreferences]);

  const handleClearLocalAppData = useCallback(async () => {
    if (isClearingLocalData) {
      return;
    }

    setIsClearingLocalData(true);
    setIsLocalDraftReady(false);
    commitPendingTextEdit();

    try {
      await clearEditorDraftDatabase();
      clearEditorPreferences();

      replaceImageAssets([]);
      setProjects([]);
      setActiveProjectId(null);
      replaceProjectPath(null);
      setCurrentPage(1);
      clearFile();
      resetHistory();
      resetProjectRuntimeState();
      setEditorPreferences(defaultEditorPreferences);
      setPendingRemoveProjectId(null);
      setIsRemoveProjectDialogOpen(false);
      setIsClearLocalDataDialogOpen(false);
      setIsSettingsDialogOpen(false);

      toast.success("Cleared local app data");
    } catch {
      toast.error("Unable to clear local app data", {
        description: "Please try again.",
      });
    } finally {
      setIsLocalDraftReady(true);
      setIsClearingLocalData(false);
    }
  }, [
    clearFile,
    commitPendingTextEdit,
    isClearingLocalData,
    replaceImageAssets,
    replaceProjectPath,
    resetHistory,
    resetProjectRuntimeState,
    setEditorPreferences,
  ]);

  const handleRequestWorkspacePageScroll = useCallback(
    (pageNumber: number, behavior: ScrollBehavior = "smooth") => {
      setScrollToPageRequest((currentRequest) => ({
        behavior,
        pageNumber,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
    },
    [],
  );

  const handleSelectSidebarPage = useCallback(
    (pageNumber: number) => {
      setCurrentPage(pageNumber);
      handleRequestWorkspacePageScroll(pageNumber);
    },
    [handleRequestWorkspacePageScroll],
  );

  return (
    <TooltipProvider delayDuration={700}>
      <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <input
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <input
          accept={supportedImageAcceptValue}
          className="hidden"
          onChange={handleImageFileChange}
          ref={imageInputRef}
          type="file"
        />
        <EditorToolbar
          activeProjectId={activeProjectId}
          activeImageAssetId={activeImageAsset?.id ?? null}
          activeSignatureAssetId={activeSignatureAsset?.id ?? null}
          canCloseProject={Boolean(loadedDocument) || overlays.length > 0}
          canRedo={canRedo}
          canUndo={canUndo}
          documentFontOptions={documentFontOptions}
          fileName={loadedDocument?.fileName ?? null}
          imageAssets={recentImageAssets}
          isExporting={isExporting}
          isImageToolActive={activeTool?.type === "image"}
          isLayersSidebarOpen={editorPreferences.isLayersSidebarOpen}
          isPagesSidebarOpen={isPagesSidebarOpen}
          isMarkSettingsDefault={isMarkSettingsDefault}
          isMarkToolActive={activeTool?.type === "mark"}
          isSignatureToolActive={activeTool?.type === "signature"}
          isTextSettingsDefault={isTextSettingsDefault}
          isTextToolActive={activeTool?.type === "text"}
          isWhiteoutSettingsDefault={isWhiteoutSettingsDefault}
          isWhiteoutToolActive={activeTool?.type === "whiteout"}
          markSettings={currentMarkSettings}
          onCloseActiveProject={handleCloseActiveProject}
          onCreateSignature={handleCreateSignature}
          onExportPdf={handleExportPdf}
          onImportImageUrl={handleImportImageUrl}
          onMarkSettingsChange={handleMarkSettingsChange}
          onMarkSettingsReset={handleMarkSettingsReset}
          onMarkToolActivate={handleMarkToolActivate}
          onMarkToolClick={handleMarkToolClick}
          onImportImageFromClipboard={handleImportImageFromClipboard}
          onOpenFile={handleOpenFileDialog}
          onOpenImageDialog={handleOpenImageDialog}
          onOpenSettings={handleOpenSettings}
          onRedo={handleRedo}
          onRemoveImageAssetFromRecents={hideImageAssetFromRecents}
          onRemoveSignatureAssetFromRecents={hideImageAssetFromRecents}
          onOpenProjectInNewTab={handleOpenProjectInNewTab}
          onRemoveProject={handleRemoveProject}
          onSelectProject={handleSelectProject}
          onSelectImageAsset={handleSelectImageAsset}
          onSelectSignatureAsset={handleSelectSignatureAsset}
          onTextSettingsChange={handleTextSettingsChange}
          onTextSettingsReset={handleTextSettingsReset}
          onTextToolClick={handleTextToolClick}
          onToggleLayersSidebar={handleToggleLayersSidebar}
          onTogglePagesSidebar={handleTogglePagesSidebar}
          onUndo={handleUndo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={loadedDocument?.pageCount ?? 0}
          projects={toolbarProjects}
          signatureAssets={recentSignatureAssets}
          status={displayStatus}
          textSettings={currentTextSettings}
          whiteoutSettings={currentWhiteoutSettings}
          onWhiteoutSettingsChange={handleWhiteoutSettingsChange}
          onWhiteoutSettingsReset={handleWhiteoutSettingsReset}
          onWhiteoutToolClick={handleWhiteoutToolClick}
          zoomPercent={Math.round(zoom * 100)}
        />
        <div className="flex min-h-0 flex-1 bg-workspace text-workspace-foreground">
          <SidebarDragDropProvider
            onCommitHistoryFromBase={commitHistoryFromBase}
            currentPage={currentPage}
            moveOverlayLayer={moveOverlayLayer}
            onCurrentPageChange={setCurrentPage}
            onGetHistoryEntrySnapshot={getHistoryEntrySnapshot}
            onRequestWorkspacePageScroll={handleRequestWorkspacePageScroll}
            onStopEditingOverlay={handleStopEditingOverlay}
            overlays={overlays}
            pageSizes={basePageSizes}
            replaceOverlays={replaceOverlays}
            selectedOverlayId={selectedOverlayId}
          >
            {isPagesSidebarOpen && (
              <PagesSidebar
                currentPage={currentPage}
                document={loadedDocument}
                imageAssetById={imageAssetById}
                onSelectPage={handleSelectSidebarPage}
                overlaysByPage={overlaysByPage}
                pageCount={loadedDocument?.pageCount ?? 0}
              />
            )}
            {editorPreferences.isLayersSidebarOpen && (
              <LayersSidebar
                imageAssetById={imageAssetById}
                onSelectOverlay={handleSelectOverlay}
                pageOverlays={currentPageLayerOverlays}
                selectedOverlayId={selectedOverlayId}
              />
            )}
          </SidebarDragDropProvider>
          <DocumentWorkspace
            currentPage={currentPage}
            document={loadedDocument}
            editingOverlayId={editingOverlayId}
            error={error}
            activeImageAsset={activeImageAsset}
            activeSignatureAsset={activeSignatureAsset}
            imageAssetById={imageAssetById}
            isImageToolActive={activeTool?.type === "image"}
            isMarkToolActive={activeTool?.type === "mark"}
            missingProjectId={missingProjectId}
            isSignatureToolActive={activeTool?.type === "signature"}
            isTextToolActive={activeTool?.type === "text"}
            isWhiteoutToolActive={activeTool?.type === "whiteout"}
            onCancelActiveTool={handleClearActiveTool}
            onClearSelection={handleClearSelection}
            onCurrentPageChange={setCurrentPage}
            onDropImageFile={handleDropImageFile}
            onDropPdfFile={handleDropPdfFile}
            onEditOverlay={handleEditOverlay}
            onOpenFile={handleOpenFileDialog}
            onPageSizeChange={handlePageSizeChange}
            onPlaceImageOverlay={handlePlaceImageOverlay}
            onPlaceMarkOverlay={handlePlaceMarkOverlay}
            onPlaceSignatureOverlay={handlePlaceSignatureOverlay}
            onPlaceTextOverlay={handlePlaceTextOverlay}
            onPlaceWhiteoutOverlay={handlePlaceWhiteoutOverlay}
            onSelectOverlay={handleSelectOverlay}
            onUpdateTextOverlay={updateTextOverlayDraft}
            onUpdateOverlayRect={updateOverlayRect}
            onUpdateOverlayRotation={updateOverlayRotation}
            overlaysByPage={overlaysByPage}
            pageSizes={pageSizes}
            selectedOverlayId={selectedOverlayId}
            selectedOverlayPageNumber={selectedOverlayPageNumber}
            status={displayStatus}
            scrollToPageRequest={scrollToPageRequest}
            whiteoutColor={currentWhiteoutSettings.color}
            zoom={zoom}
          />
        </div>
        <SettingsDialog
          onClearLocalDataClick={() => {
            setIsSettingsDialogOpen(false);
            setIsClearLocalDataDialogOpen(true);
          }}
          onOpenChange={setIsSettingsDialogOpen}
          onThemeChange={(nextThemeName) =>
            updateEditorPreferences({ themeName: nextThemeName })
          }
          open={isSettingsDialogOpen}
          themeName={themeName}
        />
        <ClearLocalDataDialog
          isClearing={isClearingLocalData}
          onConfirm={() => {
            void handleClearLocalAppData();
          }}
          onOpenChange={setIsClearLocalDataDialogOpen}
          open={isClearLocalDataDialogOpen}
        />
        <Dialog
          open={isRemoveProjectDialogOpen}
          onOpenChange={(isOpen) => {
            setIsRemoveProjectDialogOpen(isOpen);

            if (!isOpen) {
              setPendingRemoveProjectId(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pendingRemoveProjectFileName
                  ? `Remove project ${pendingRemoveProjectFileName}?`
                  : "Remove project?"}
              </DialogTitle>
              <DialogDescription>
                This will remove the PDF and local edits from this browser. Your
                original file will not be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleConfirmRemoveProject} type="button">
                Remove Project
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster position="bottom-right" theme={isDark ? "dark" : "light"} />
      </main>
    </TooltipProvider>
  );
}

function downloadBytes(bytes: Uint8Array, fileName: string) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  const blob = new Blob([arrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Please try again.";
}

function createProjectFromPersistedRecord(
  record: PersistedEditorProjectRecord,
): Project {
  return {
    createdAt: record.createdAt,
    currentPage: record.currentPage,
    fileName: record.fileName,
    history: record.history ?? createEditorHistory(),
    id: record.id,
    lastModifiedAt: record.updatedAt,
    pageCount: record.pageCount,
    pdfBytes: record.pdfBytes,
  };
}

const emptyEditorOverlays: EditorOverlay[] = [];

function useStableOverlaysByPage(overlays: EditorOverlay[]) {
  const previousOverlaysByPageRef =
    useRef<ReadonlyMap<number, EditorOverlay[]>>(emptyOverlaysByPage);

  return useMemo(() => {
    // eslint-disable-next-line react-hooks/refs -- This hook intentionally compares against the previous render's page arrays to preserve stable child props.
    const previousOverlaysByPage = previousOverlaysByPageRef.current;
    const nextOverlaysByPage = groupOverlaysByPage(
      overlays,
      previousOverlaysByPage,
    );

    // eslint-disable-next-line react-hooks/refs -- This is a memo cache update for the next render, not render data.
    previousOverlaysByPageRef.current = nextOverlaysByPage;
    return nextOverlaysByPage;
  }, [overlays]);
}

const emptyOverlaysByPage = new Map<number, EditorOverlay[]>();

function groupOverlaysByPage(
  overlays: EditorOverlay[],
  previousOverlaysByPage: ReadonlyMap<number, EditorOverlay[]>,
) {
  const nextOverlaysByPage = new Map<number, EditorOverlay[]>();

  for (const overlay of overlays) {
    const pageOverlays = nextOverlaysByPage.get(overlay.pageNumber);

    if (pageOverlays) {
      pageOverlays.push(overlay);
    } else {
      nextOverlaysByPage.set(overlay.pageNumber, [overlay]);
    }
  }

  for (const [pageNumber, pageOverlays] of nextOverlaysByPage) {
    const previousPageOverlays = previousOverlaysByPage.get(pageNumber);

    if (
      previousPageOverlays &&
      areOverlayArrayReferencesEqual(pageOverlays, previousPageOverlays)
    ) {
      nextOverlaysByPage.set(pageNumber, previousPageOverlays);
    }
  }

  return nextOverlaysByPage;
}

function areOverlayArrayReferencesEqual(
  left: EditorOverlay[],
  right: EditorOverlay[] | undefined,
) {
  return (
    right !== undefined &&
    left.length === right.length &&
    left.every((overlay, index) => overlay === right[index])
  );
}

function createImageAssetMap(imageAssets: ImageAsset[]) {
  return new Map(
    imageAssets.map((imageAsset) => [imageAsset.id, imageAsset] as const),
  );
}

type MarkSettings = Pick<MarkOverlay, "color" | "markType">;
type TextSettings = Pick<TextOverlay, "color" | "fontId" | "fontSize" | "text">;
type WhiteoutSettings = Pick<WhiteoutOverlay, "color">;

function getNextMarkSettings<T extends MarkSettings>(
  currentSettings: T,
  patch: MarkOverlayPatch,
) {
  return isMarkSettingsPatchNoop(currentSettings, patch)
    ? currentSettings
    : ({ ...currentSettings, ...patch } as T);
}

function isMarkSettingsPatchNoop(
  settings: MarkSettings,
  patch: MarkOverlayPatch,
) {
  return (
    (patch.color === undefined || patch.color === settings.color) &&
    (patch.markType === undefined || patch.markType === settings.markType)
  );
}

function areMarkSettingsEqual(left: MarkSettings, right: MarkSettings) {
  return left.color === right.color && left.markType === right.markType;
}

function getNextTextSettings(
  currentSettings: TextOverlayDefaults,
  patch: TextOverlayPatch,
) {
  return isTextSettingsPatchNoop(currentSettings, patch)
    ? currentSettings
    : { ...currentSettings, ...patch };
}

function isTextSettingsPatchNoop(
  settings: TextSettings,
  patch: TextOverlayPatch,
) {
  return (
    (patch.color === undefined || patch.color === settings.color) &&
    (patch.fontId === undefined || patch.fontId === settings.fontId) &&
    (patch.fontSize === undefined || patch.fontSize === settings.fontSize) &&
    (patch.text === undefined || patch.text === settings.text)
  );
}

function getNextWhiteoutSettings<T extends WhiteoutSettings>(
  currentSettings: T,
  patch: WhiteoutOverlayPatch,
) {
  return isWhiteoutSettingsPatchNoop(currentSettings, patch)
    ? currentSettings
    : ({ ...currentSettings, ...patch } as T);
}

function isWhiteoutSettingsPatchNoop(
  settings: WhiteoutSettings,
  patch: WhiteoutOverlayPatch,
) {
  return patch.color === undefined || patch.color === settings.color;
}

function areWhiteoutSettingsEqual(
  left: WhiteoutSettings,
  right: WhiteoutSettings,
) {
  return left.color === right.color;
}

export { AppShell };

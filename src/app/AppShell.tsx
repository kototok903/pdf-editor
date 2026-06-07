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
  ImageAsset,
  MarkOverlay,
  MarkOverlayPatch,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  WhiteoutOverlay,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorClipboardActions } from "@/features/editor/hooks/useEditorClipboardActions";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { useEditorKeyboardShortcuts } from "@/features/editor/hooks/useEditorKeyboardShortcuts";
import { useEditorProjectSession } from "@/features/editor/hooks/useEditorProjectSession";
import { useEditorTools } from "@/features/editor/hooks/useEditorTools";
import { useOverlayEditingSession } from "@/features/editor/hooks/useOverlayEditingSession";
import { useImageAssets } from "@/features/editor/hooks/useImageAssets";
import {
  useEditorPreferences,
  useResolvedEditorTheme,
} from "@/features/editor/hooks/useEditorPreferences";
import { supportedImageAcceptValue } from "@/features/editor/lib/image-asset-utils";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";
import { defaultMarkSettings } from "@/features/editor/lib/mark-definitions";
import {
  defaultTextOverlay,
  defaultWhiteoutOverlay,
} from "@/features/editor/lib/overlay-defaults";
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
import { createExportFileName } from "@/features/pdf-export/lib/export-file-name";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";
import { usePdfPageSizes } from "@/features/pdf/hooks/usePdfPageSizes";
import { isDocumentFontExtractionEnabled } from "@/features/pdf/lib/pdf-font-extraction-config";
import { scalePageSizes } from "@/features/pdf/lib/pdf-page-size-utils";
import type { PageSize } from "@/features/pdf/pdf-types";

const zoomStep = 0.1;

function AppShell() {
  const exportedFileNamesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearLocalDataDialogOpen, setIsClearLocalDataDialogOpen] =
    useState(false);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
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

  const {
    clearEditing,
    commitPendingTextEdit,
    editingOverlayId,
    editOverlay: handleEditOverlay,
    isEditingOverlayDifferentFrom,
    resetEditingSession,
  } = useOverlayEditingSession({
    commitHistoryFromBase,
    getHistoryEntrySnapshot,
  });

  const handleClearSelection = useCallback(() => {
    commitPendingTextEdit();
    clearSelection();
    clearEditing();
  }, [clearEditing, clearSelection, commitPendingTextEdit]);

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
    () => ({
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

  const {
    activeImageAsset,
    activeSignatureAsset,
    activeTool,
    activateImageAsset: handleSelectImageAsset,
    activateMarkTool: handleMarkToolActivate,
    activateSignatureAsset: handleSelectSignatureAsset,
    addRenderableOverlay,
    clearActiveTool: handleClearActiveTool,
    createSignature: handleCreateSignature,
    dropImageFile: handleDropImageFile,
    importImageFile,
    importImageFromClipboard: handleImportImageFromClipboard,
    importImageUrl: handleImportImageUrl,
    placeImageOverlay: handlePlaceImageOverlay,
    placeMarkOverlay: handlePlaceMarkOverlay,
    placeSignatureOverlay: handlePlaceSignatureOverlay,
    placeTextOverlay: handlePlaceTextOverlay,
    placeWhiteoutOverlay: handlePlaceWhiteoutOverlay,
    resetActiveTool,
    toggleMarkTool: handleMarkToolClick,
    toggleTextTool: handleTextToolClick,
    toggleWhiteoutTool: handleWhiteoutToolClick,
  } = useEditorTools({
    addImageBlob,
    addImageFile,
    addImageUrl,
    addOverlay,
    addSignatureBlob,
    currentPage,
    editOverlay: handleEditOverlay,
    getCurrentPageSize,
    imageAssets,
    markDefaults,
    setCurrentPage,
    showImageAssetInRecents,
    textDefaults,
    whiteoutDefaults: currentWhiteoutSettings,
  });

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
    clearEditing();
    resetActiveTool();
  }, [clearEditing, commitPendingTextEdit, resetActiveTool, undo]);

  const handleRedo = useCallback(() => {
    commitPendingTextEdit();
    redo();
    clearEditing();
    resetActiveTool();
  }, [clearEditing, commitPendingTextEdit, redo, resetActiveTool]);

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
    resetEditingSession();
    resetActiveTool();
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
  }, [
    clearClipboardHistory,
    resetActiveTool,
    resetEditingSession,
    setEditorPreferences,
  ]);

  const {
    activeProjectId,
    clearProjectSessionForLocalData,
    closeActiveProject: handleCloseActiveProject,
    confirmRemoveProject: handleConfirmRemoveProject,
    displayStatus,
    isRemoveProjectDialogOpen,
    missingProjectId,
    onRemoveProjectDialogOpenChange: handleRemoveProjectDialogOpenChange,
    openPdfAsProject,
    openProjectInNewTab: handleOpenProjectInNewTab,
    pendingRemoveProjectFileName,
    removeProject: handleRemoveProject,
    selectProject: handleSelectProject,
    setIsLocalDraftReady,
    toolbarProjects,
  } = useEditorProjectSession({
    clearFile,
    commitPendingTextEdit,
    currentPage,
    document: loadedDocument,
    history,
    imageAssets,
    openBytes,
    openFile,
    overlays,
    replaceImageAssets,
    resetHistory,
    resetProjectRuntimeState,
    setCurrentPage,
    setScrollToPageRequest,
    status,
  });

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
    clearEditing();

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
    clearEditing,
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

    void importImageFile(file);
  };

  const handleDropPdfFile = useCallback(
    (file: File) => {
      void openPdfAsProject(file);
    },
    [openPdfAsProject],
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

      if (isEditingOverlayDifferentFrom(overlayId)) {
        handleEditOverlay(null);
      }
    },
    [handleEditOverlay, isEditingOverlayDifferentFrom, selectOverlay],
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
      clearEditorPreferences();
      await clearProjectSessionForLocalData();
      replaceImageAssets([]);
      setEditorPreferences(defaultEditorPreferences);
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
    clearProjectSessionForLocalData,
    commitPendingTextEdit,
    isClearingLocalData,
    replaceImageAssets,
    setEditorPreferences,
    setIsLocalDraftReady,
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
          onOpenChange={handleRemoveProjectDialogOpenChange}
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

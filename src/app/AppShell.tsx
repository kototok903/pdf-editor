import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
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
import {
  OrganizePagesDialog,
  type OrganizePagesDialogExportInput,
  type OrganizePagesDialogSaveInput,
} from "@/features/editor/components/OrganizePagesDialog";
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import {
  ClearLocalDataDialog,
  SettingsDialog,
} from "@/features/editor/components/SettingsDialog";
import { SidebarDragDropProvider } from "@/features/editor/components/SidebarDragDropProvider";
import type {
  DocumentSource,
  EditorOverlay,
  ImageAsset,
  MarkOverlay,
  MarkOverlayPatch,
  PdfFormValue,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
  WhiteoutOverlay,
  WhiteoutOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorClipboardActions } from "@/features/editor/hooks/useEditorClipboardActions";
import { useEditorKeyboardShortcuts } from "@/features/editor/hooks/useEditorKeyboardShortcuts";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import {
  useEditorPreferences,
  useResolvedEditorTheme,
} from "@/features/editor/hooks/useEditorPreferences";
import { useEditorProjectSession } from "@/features/editor/hooks/useEditorProjectSession";
import { useEditorTools } from "@/features/editor/hooks/useEditorTools";
import { useImageAssets } from "@/features/editor/hooks/useImageAssets";
import { useOverlayEditingSession } from "@/features/editor/hooks/useOverlayEditingSession";
import {
  getPageIdForVisiblePage,
  getVisiblePageNumberForPageId,
} from "@/features/editor/lib/document-pages";
import { updatePdfFormValue } from "@/features/editor/lib/editor-form-edits";
import type { EditorHistoryEntry } from "@/features/editor/lib/editor-history";
import {
  clearEditorPreferences,
  defaultEditorPreferences,
  type EditorPreferences,
  maxEditorZoom,
  minEditorZoom,
} from "@/features/editor/lib/editor-preferences";
import { supportedImageAcceptValue } from "@/features/editor/lib/image-asset-utils";
import { getPageLayerOverlays } from "@/features/editor/lib/layer-sidebar-utils";
import { defaultMarkSettings } from "@/features/editor/lib/mark-definitions";
import {
  defaultTextOverlay,
  defaultWhiteoutOverlay,
} from "@/features/editor/lib/overlay-defaults";
import { isDocumentTextFontId } from "@/features/editor/lib/text-font-id-utils";
import {
  clearDocumentTextFonts,
  createUnavailableDocumentTextFontOptions,
  type DocumentTextFontMenuOption,
  type DocumentTextFontOption,
  registerDocumentTextFonts,
} from "@/features/editor/lib/text-fonts";
import {
  usePdfDocument,
  usePdfSourceDocuments,
} from "@/features/pdf/hooks/usePdfDocument";
import { usePdfPageSizes } from "@/features/pdf/hooks/usePdfPageSizes";
import { isDocumentFontExtractionEnabled } from "@/features/pdf/lib/pdf-font-extraction-config";
import {
  createPdfFormFieldRegistry,
  createPdfFormValueFromElement,
  getFormElementWidgetId,
  type PdfFormWidget,
} from "@/features/pdf/lib/pdf-form-metadata";
import { scalePageSizes } from "@/features/pdf/lib/pdf-page-size-utils";
import type { LoadedPdfDocument, PageSize } from "@/features/pdf/pdf-types";
import {
  createExportFileName,
  createSelectedPagesExportFileName,
} from "@/features/pdf-export/lib/export-file-name";
import { SearchSidebar } from "@/features/pdf-search/components/SearchSidebar";
import { usePdfSearch } from "@/features/pdf-search/hooks/usePdfSearch";
import type {
  PdfSearchMatch,
  PdfSearchOptions,
} from "@/features/pdf-search/pdf-search-types";

const zoomStep = 0.1;

export function AppShell() {
  const exportedFileNamesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [isClearLocalDataDialogOpen, setIsClearLocalDataDialogOpen] =
    useState(false);
  const [isClearingLocalData, setIsClearingLocalData] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isOrganizePagesDialogOpen, setIsOrganizePagesDialogOpen] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOptions, setSearchOptions] = useState<PdfSearchOptions>({
    matchCase: false,
    wholeWord: false,
  });
  const [activeSearchMatchId, setActiveSearchMatchId] = useState<string | null>(
    null,
  );
  const [organizerBaseEntry, setOrganizerBaseEntry] =
    useState<EditorHistoryEntry | null>(null);
  const [renderedBasePageSizes, setRenderedBasePageSizes] = useState<
    Record<number, PageSize>
  >({});
  const [formWidgetsByPage, setFormWidgetsByPage] = useState<
    Record<string, PdfFormWidget[]>
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
    isSearchSidebarOpen,
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
    commitEditorStateFromBase,
    commitHistoryFromBase,
    documentPages,
    getHistoryEntrySnapshot,
    formEdits,
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
    updateFormValue,
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
  const currentPageId = getPageIdForVisiblePage(documentPages, currentPage);
  const overlaysByPage = useStableOverlaysByPage(overlays, documentPages);
  const formFieldRegistry = useMemo(
    () =>
      createPdfFormFieldRegistry(
        Object.values(formWidgetsByPage).flatMap((widgets) => widgets),
      ),
    [formWidgetsByPage],
  );
  const imageAssetById = useMemo(
    () => createImageAssetMap(imageAssets),
    [imageAssets],
  );
  const currentPageOverlays =
    overlaysByPage.get(currentPage) ?? emptyEditorOverlays;
  const currentPageLayerOverlays = useMemo(
    () =>
      currentPageId
        ? getPageLayerOverlays(currentPageOverlays, currentPageId)
        : emptyEditorOverlays,
    [currentPageId, currentPageOverlays],
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
  const selectedOverlayPageNumber = getVisiblePageNumberForPageId(
    documentPages,
    selectedOverlay?.pageId ?? null,
  );

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
    documentPages,
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
    documentPages,
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
    documentPages,
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
    setFormWidgetsByPage({});
    setScrollToPageRequest(null);
    setSearchQuery("");
    setActiveSearchMatchId(null);
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
    activeProject,
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
    ensureActiveProjectMetadata,
    updateActiveProjectDocumentSources,
    updateActiveProjectMetadata,
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

  const activeDocumentSources = useMemo(
    () =>
      getActiveDocumentSources(activeProject?.documentSources ?? [], {
        documentPages,
        loadedDocument,
      }),
    [activeProject?.documentSources, documentPages, loadedDocument],
  );
  const sourceDocumentsById = usePdfSourceDocuments(
    activeDocumentSources,
    loadedDocument,
  );
  const searchResults = usePdfSearch({
    documentPages,
    options: searchOptions,
    query: searchQuery,
    sourceDocumentsById,
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
    const focusedFormValue = getFocusedFormValue(formFieldRegistry.widgetsById);
    const exportFormEdits = focusedFormValue
      ? updatePdfFormValue(formEdits, focusedFormValue)
      : formEdits;

    if (focusedFormValue && exportFormEdits !== formEdits) {
      updateFormValue(focusedFormValue);
    }

    setIsExporting(true);
    clearEditing();

    try {
      const fileName = createExportFileName(
        loadedDocument.fileName,
        exportedFileNamesRef.current,
      );
      const { exportPdf } =
        await import("@/features/pdf-export/lib/export-pdf");
      const exportProject = await ensureActiveProjectMetadata();
      const exportedBytes = await exportPdf({
        documentFonts: documentFontOptions.filter(
          (fontOption): fontOption is DocumentTextFontOption =>
            fontOption.isAvailable,
        ),
        formEdits: exportFormEdits,
        imageAssets,
        metadata: exportProject?.metadata ?? activeProject?.metadata ?? null,
        documentPages,
        documentSources:
          exportProject?.documentSources ??
          activeProject?.documentSources ??
          [],
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
    formEdits,
    formFieldRegistry,
    imageAssets,
    isExporting,
    loadedDocument,
    documentPages,
    overlays,
    activeProject,
    ensureActiveProjectMetadata,
    updateFormValue,
  ]);

  const handleOpenOrganizePagesDialog = useCallback(() => {
    if (!loadedDocument) {
      return;
    }

    commitPendingTextEdit();
    const focusedFormValue = getFocusedFormValue(formFieldRegistry.widgetsById);

    if (focusedFormValue) {
      updateFormValue(focusedFormValue);
    }

    setOrganizerBaseEntry(getHistoryEntrySnapshot());
    setIsOrganizePagesDialogOpen(true);
    clearEditing();
  }, [
    clearEditing,
    commitPendingTextEdit,
    formFieldRegistry,
    getHistoryEntrySnapshot,
    loadedDocument,
    updateFormValue,
  ]);

  const handleSaveOrganizePages = useCallback(
    (input: OrganizePagesDialogSaveInput) => {
      if (!loadedDocument) {
        return;
      }

      const baseEntry = organizerBaseEntry ?? getHistoryEntrySnapshot();

      updateActiveProjectDocumentSources(input.documentSources);
      commitEditorStateFromBase(baseEntry, {
        documentPages: input.documentPages,
        formEdits: input.formEdits,
        overlays: input.overlays,
        selectedOverlayId: null,
      });
      clearSelection();
      setOrganizerBaseEntry(null);

      const nextCurrentPage = Math.min(
        Math.max(1, currentPage),
        input.documentPages.length,
      );

      setCurrentPage(nextCurrentPage);
      setScrollToPageRequest((currentRequest) => ({
        behavior: "auto",
        pageNumber: nextCurrentPage,
        requestId: (currentRequest?.requestId ?? 0) + 1,
      }));
      toast.success("Updated pages");
    },
    [
      clearSelection,
      commitEditorStateFromBase,
      currentPage,
      getHistoryEntrySnapshot,
      loadedDocument,
      organizerBaseEntry,
      setScrollToPageRequest,
      updateActiveProjectDocumentSources,
    ],
  );

  const handleExportOrganizedPages = useCallback(
    async (input: OrganizePagesDialogExportInput) => {
      if (
        !loadedDocument ||
        isExporting ||
        input.selectedPageIds.length === 0
      ) {
        return;
      }

      setIsExporting(true);

      try {
        const { exportPdf } =
          await import("@/features/pdf-export/lib/export-pdf");
        const exportProject = await ensureActiveProjectMetadata();
        const exportedBytes = await exportPdf({
          documentFonts: documentFontOptions.filter(
            (fontOption): fontOption is DocumentTextFontOption =>
              fontOption.isAvailable,
          ),
          documentPages: input.documentPages,
          documentSources: input.documentSources,
          formEdits: input.formEdits,
          imageAssets,
          metadata: exportProject?.metadata ?? activeProject?.metadata ?? null,
          originalPdfBytes: loadedDocument.bytes,
          overlays: input.overlays,
          selectedPageIds: input.selectedPageIds,
        });
        const fileName = createSelectedPagesExportFileName(
          loadedDocument.fileName,
          input.selectedRangesLabel,
          exportedFileNamesRef.current,
        );

        downloadBytes(exportedBytes, fileName);
        exportedFileNamesRef.current.add(fileName);
        toast.success("Exported selected pages", {
          description: fileName,
        });
      } catch (error) {
        toast.error("Unable to export selected pages", {
          description: getExportErrorMessage(error),
        });
      } finally {
        setIsExporting(false);
      }
    },
    [
      activeProject,
      documentFontOptions,
      ensureActiveProjectMetadata,
      imageAssets,
      isExporting,
      loadedDocument,
    ],
  );

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

  const handleFormWidgetsChange = useCallback(
    (pageId: string, widgets: PdfFormWidget[]) => {
      setFormWidgetsByPage((currentWidgetsByPage) => {
        const currentWidgets = currentWidgetsByPage[pageId] ?? [];

        if (arePdfFormWidgetArraysEqual(currentWidgets, widgets)) {
          return currentWidgetsByPage;
        }

        if (widgets.length === 0) {
          const nextWidgetsByPage = { ...currentWidgetsByPage };

          delete nextWidgetsByPage[pageId];

          return nextWidgetsByPage;
        }

        return {
          ...currentWidgetsByPage,
          [pageId]: widgets,
        };
      });
    },
    [],
  );

  const handleCommitFormValue = useCallback(
    (value: PdfFormValue) => {
      const field = formFieldRegistry.fieldsByName.get(value.fieldName);

      if (field?.readOnly) {
        return;
      }

      updateFormValue(value);
    },
    [formFieldRegistry, updateFormValue],
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

  const handleToggleSearchSidebar = useCallback(() => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      isSearchSidebarOpen: !currentPreferences.isSearchSidebarOpen,
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

  const handleSearchQueryChange = useCallback((nextQuery: string) => {
    setSearchQuery(nextQuery);
    setActiveSearchMatchId(null);
  }, []);

  const handleSearchMatchCaseChange = useCallback((enabled: boolean) => {
    setSearchOptions((currentOptions) => ({
      ...currentOptions,
      matchCase: enabled,
    }));
    setActiveSearchMatchId(null);
  }, []);

  const handleSearchWholeWordChange = useCallback((enabled: boolean) => {
    setSearchOptions((currentOptions) => ({
      ...currentOptions,
      wholeWord: enabled,
    }));
    setActiveSearchMatchId(null);
  }, []);

  const handleSearchResultClick = useCallback(
    (match: PdfSearchMatch) => {
      setActiveSearchMatchId(match.id);
      setCurrentPage(match.pageNumber);
      handleRequestWorkspacePageScroll(match.pageNumber);
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
          isSearchSidebarOpen={isSearchSidebarOpen}
          isMarkSettingsDefault={isMarkSettingsDefault}
          isMarkToolActive={activeTool?.type === "mark"}
          isSignatureToolActive={activeTool?.type === "signature"}
          isTextSettingsDefault={isTextSettingsDefault}
          isTextToolActive={activeTool?.type === "text"}
          isWhiteoutSettingsDefault={isWhiteoutSettingsDefault}
          isWhiteoutToolActive={activeTool?.type === "whiteout"}
          markSettings={currentMarkSettings}
          activeProject={activeProject}
          onUpdateActiveProjectMetadata={updateActiveProjectMetadata}
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
          onOpenOrganizePages={handleOpenOrganizePagesDialog}
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
          onToggleSearchSidebar={handleToggleSearchSidebar}
          onUndo={handleUndo}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={documentPages.length}
          pageSizes={basePageSizes}
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
            documentPages={documentPages}
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
                documentPages={documentPages}
                imageAssetById={imageAssetById}
                onSelectPage={handleSelectSidebarPage}
                overlaysByPage={overlaysByPage}
                pageCount={documentPages.length}
                sourceDocumentsById={sourceDocumentsById}
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
            documentPages={documentPages}
            editingOverlayId={editingOverlayId}
            error={error}
            formEdits={formEdits}
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
            onCommitFormValue={handleCommitFormValue}
            onCurrentPageChange={setCurrentPage}
            onDropImageFile={handleDropImageFile}
            onDropPdfFile={handleDropPdfFile}
            onEditOverlay={handleEditOverlay}
            onFormWidgetsChange={handleFormWidgetsChange}
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
            sourceDocumentsById={sourceDocumentsById}
            selectedOverlayId={selectedOverlayId}
            selectedOverlayPageNumber={selectedOverlayPageNumber}
            status={displayStatus}
            scrollToPageRequest={scrollToPageRequest}
            whiteoutColor={currentWhiteoutSettings.color}
            zoom={zoom}
          />
          {loadedDocument && isSearchSidebarOpen && (
            <SearchSidebar
              activeMatchId={activeSearchMatchId}
              groups={searchResults.groups}
              isSearching={searchResults.isSearching}
              matchCase={searchOptions.matchCase}
              onMatchCaseChange={handleSearchMatchCaseChange}
              onQueryChange={handleSearchQueryChange}
              onResultClick={handleSearchResultClick}
              onWholeWordChange={handleSearchWholeWordChange}
              query={searchQuery}
              resultCount={searchResults.resultCount}
              wholeWord={searchOptions.wholeWord}
            />
          )}
        </div>
        {isOrganizePagesDialogOpen && (
          <OrganizePagesDialog
            document={loadedDocument}
            documentPages={documentPages}
            documentSources={activeDocumentSources}
            formEdits={formEdits}
            imageAssetById={imageAssetById}
            isExporting={isExporting}
            onExportSelectedPages={handleExportOrganizedPages}
            onOpenChange={(isOpen) => {
              setIsOrganizePagesDialogOpen(isOpen);

              if (!isOpen) {
                setOrganizerBaseEntry(null);
              }
            }}
            onSave={handleSaveOrganizePages}
            open={isOrganizePagesDialogOpen}
            overlays={overlays}
          />
        )}
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
              <Button
                variant="destructive"
                onClick={handleConfirmRemoveProject}
                type="button"
              >
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

function getActiveDocumentSources(
  documentSources: DocumentSource[],
  {
    documentPages,
    loadedDocument,
  }: {
    documentPages: readonly { sourceId: string }[];
    loadedDocument: LoadedPdfDocument | null;
  },
) {
  if (documentSources.length > 0) {
    return documentSources;
  }

  const sourceId = documentPages[0]?.sourceId;

  if (!sourceId || !loadedDocument) {
    return [];
  }

  return [
    {
      bytes: loadedDocument.bytes,
      fileName: loadedDocument.fileName,
      id: sourceId,
      pageCount: loadedDocument.pageCount,
    },
  ];
}

const emptyEditorOverlays: EditorOverlay[] = [];

function useStableOverlaysByPage(
  overlays: EditorOverlay[],
  documentPages: readonly { id: string }[],
) {
  const previousOverlaysByPageRef =
    useRef<ReadonlyMap<number, EditorOverlay[]>>(emptyOverlaysByPage);

  return useMemo(() => {
    // eslint-disable-next-line react-hooks/refs -- This hook intentionally compares against the previous render's page arrays to preserve stable child props.
    const previousOverlaysByPage = previousOverlaysByPageRef.current;
    const nextOverlaysByPage = groupOverlaysByPage(
      overlays,
      documentPages,
      previousOverlaysByPage,
    );

    // eslint-disable-next-line react-hooks/refs -- This is a memo cache update for the next render, not render data.
    previousOverlaysByPageRef.current = nextOverlaysByPage;
    return nextOverlaysByPage;
  }, [documentPages, overlays]);
}

const emptyOverlaysByPage = new Map<number, EditorOverlay[]>();

function groupOverlaysByPage(
  overlays: EditorOverlay[],
  documentPages: readonly { id: string }[],
  previousOverlaysByPage: ReadonlyMap<number, EditorOverlay[]>,
) {
  const nextOverlaysByPage = new Map<number, EditorOverlay[]>();
  const visiblePageById = new Map(
    documentPages.map((page, index) => [page.id, index + 1]),
  );

  for (const overlay of overlays) {
    const pageNumber = visiblePageById.get(overlay.pageId);

    if (!pageNumber) {
      continue;
    }

    const pageOverlays = nextOverlaysByPage.get(pageNumber);

    if (pageOverlays) {
      pageOverlays.push(overlay);
    } else {
      nextOverlaysByPage.set(pageNumber, [overlay]);
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

function arePdfFormWidgetArraysEqual(
  left: PdfFormWidget[],
  right: PdfFormWidget[],
) {
  return (
    left.length === right.length &&
    left.every((widget, index) => {
      const rightWidget = right[index];

      return (
        rightWidget !== undefined &&
        widget.id === rightWidget.id &&
        widget.fieldName === rightWidget.fieldName &&
        widget.fieldType === rightWidget.fieldType &&
        widget.readOnly === rightWidget.readOnly
      );
    })
  );
}

function getFocusedFormValue(
  widgetsById: ReadonlyMap<string, PdfFormWidget>,
): PdfFormValue | null {
  const activeElement = document.activeElement;

  if (
    !(
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLSelectElement ||
      activeElement instanceof HTMLTextAreaElement
    )
  ) {
    return null;
  }

  const widgetId = getFormElementWidgetId(activeElement);
  const widget = widgetId ? widgetsById.get(widgetId) : null;

  if (!widget || widget.readOnly) {
    return null;
  }

  return createPdfFormValueFromElement({
    element: activeElement,
    widget,
  });
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

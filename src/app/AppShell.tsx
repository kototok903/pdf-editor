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
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import type {
  EditorOverlayInput,
  ImageAsset,
  MarkOverlay,
  MarkOverlayPatch,
  PdfRect,
  TextOverlay,
  TextOverlayDefaults,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { useEditorKeyboardShortcuts } from "@/features/editor/hooks/useEditorKeyboardShortcuts";
import { useImageAssets } from "@/features/editor/hooks/useImageAssets";
import { useEditorPreferences } from "@/features/editor/hooks/useEditorPreferences";
import { useLocalDraftPersistence } from "@/features/editor/hooks/useLocalDraftPersistence";
import {
  createImageSha256Signature,
  supportedImageAcceptValue,
  supportedImageTypeListLabel,
} from "@/features/editor/lib/image-asset-utils";
import {
  extractPlainTextFromHtml,
  textOverlayInputFromHtml,
  textOverlayInputFromPlainText,
  textOverlayInputUsingCurrentSettings,
} from "@/features/editor/lib/clipboard-text-utils";
import {
  createExternalPasteRecord,
  shouldSkipExternalPaste,
  type ExternalPasteRecord,
} from "@/features/editor/lib/external-paste-dedupe";
import { createImageOverlayRectAtPoint } from "@/features/editor/lib/overlay-coordinate-utils";
import {
  buildOverlayClipboardWritePlan,
  readPasteIntentFromAsyncClipboard,
  readPasteIntentFromClipboardData,
  writeClipboardPlanToEvent,
  writeClipboardPlanToSystemClipboard,
  type PasteIntent,
} from "@/features/editor/lib/editor-clipboard";
import {
  duplicateOverlayInput,
  getOverlayClipboardPayloadKey,
  toOverlayInput,
  type OverlayClipboardPayload,
} from "@/features/editor/lib/overlay-clipboard";
import { defaultMarkSettings } from "@/features/editor/lib/mark-definitions";
import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";
import {
  maxEditorZoom,
  minEditorZoom,
  type EditorPreferences,
} from "@/features/editor/lib/editor-preferences";
import { createExportFileName } from "@/features/pdf-export/lib/export-file-name";
import { exportPdf } from "@/features/pdf-export/lib/export-pdf";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

const zoomStep = 0.1;
type ActiveTool =
  | { type: "image"; assetId: string }
  | { type: "mark" }
  | { type: "text" }
  | null;
type LastOverlayPaste = {
  pasteCount: number;
  payloadKey: string;
};

function AppShell() {
  const exportedFileNamesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [isCloseDraftDialogOpen, setIsCloseDraftDialogOpen] = useState(false);
  const [isLocalDraftReady, setIsLocalDraftReady] = useState(false);
  const [pendingReplacementPdfFile, setPendingReplacementPdfFile] =
    useState<File | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [scrollToPageRequest, setScrollToPageRequest] = useState<{
    pageNumber: number;
    requestId: number;
  } | null>(null);
  const [lastOverlayPaste, setLastOverlayPaste] =
    useState<LastOverlayPaste | null>(null);
  const [lastExternalPaste, setLastExternalPaste] =
    useState<ExternalPasteRecord | null>(null);
  const [editorPreferences, setEditorPreferences] = useEditorPreferences();
  const { isPagesSidebarOpen, markDefaults, textDefaults, themeName, zoom } =
    editorPreferences;
  const isDark = themeName === "dark";
  const {
    addOverlay,
    clearOverlays,
    clearSelection,
    overlays,
    removeOverlay,
    replaceOverlays,
    selectOverlay,
    selectedOverlayId,
    updateMarkOverlay,
    updateOverlayRect,
    updateTextOverlay,
  } = useEditorOverlays();
  const {
    clearFile,
    document: loadedDocument,
    error,
    openBytes,
    openFile,
    status,
  } = usePdfDocument();
  const {
    addImageBlob,
    addImageFile,
    addImageUrl,
    hideImageAssetFromRecents,
    imageAssets,
    replaceImageAssets,
    recentImageAssets,
    showImageAssetInRecents,
  } = useImageAssets();
  const { clearStoredDraft, hydrateLocalDraft } = useLocalDraftPersistence({
    currentPage,
    document: loadedDocument,
    imageAssets,
    isReadyToPersist: isLocalDraftReady,
    overlays,
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
  const selectedOverlay = useMemo(
    () => overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null,
    [overlays, selectedOverlayId],
  );

  const currentTextSettings = selectedTextOverlay ?? textDefaults;
  const currentMarkSettings = selectedMarkOverlay ?? markDefaults;
  const isMarkSettingsDefault =
    currentMarkSettings.color === defaultMarkSettings.color &&
    currentMarkSettings.markType === defaultMarkSettings.markType;
  const isTextSettingsDefault =
    currentTextSettings.color === defaultTextOverlay.color &&
    currentTextSettings.fontId === defaultTextOverlay.fontId &&
    currentTextSettings.fontSize === defaultTextOverlay.fontSize;

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
    let isCancelled = false;

    const restoreLocalDraft = async () => {
      const restoredDraft = await hydrateLocalDraft();

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
        const restoredDocument = await openBytes(
          restoredDraft.draft.pdfBytes,
          restoredDraft.draft.fileName,
        );

        if (isCancelled) {
          return;
        }

        if (restoredDocument) {
          replaceOverlays(restoredDraft.draft.overlays);
          setCurrentPage(
            Math.min(
              restoredDocument.pageCount,
              Math.max(1, restoredDraft.draft.currentPage),
            ),
          );
        } else {
          try {
            await clearStoredDraft();
          } catch {
            // The restore path already failed; keep the editor usable.
          }

          toast.error("Unable to restore draft", {
            description: "The saved local draft was removed.",
          });
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
    hydrateLocalDraft,
    openBytes,
    replaceImageAssets,
    replaceOverlays,
  ]);

  const activeImageAsset =
    activeTool?.type === "image"
      ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
      : null;
  const displayStatus =
    !isLocalDraftReady && status === "empty" ? "loading" : status;

  const handleClearSelection = useCallback(() => {
    clearSelection();
    setEditingOverlayId(null);
  }, [clearSelection]);

  const handleClearActiveTool = useCallback(() => {
    setActiveTool(null);
  }, []);

  const handleEditOverlay = useCallback((overlayId: string | null) => {
    setEditingOverlayId(overlayId);
  }, []);

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
        input.type === "image" &&
        !imageAssets.some((asset) => asset.id === input.assetId) &&
        !options?.additionalRenderableImageAssetIds?.includes(input.assetId)
      ) {
        return null;
      }

      setActiveTool(null);
      setEditingOverlayId(null);

      if (input.type === "image") {
        showImageAssetInRecents(input.assetId);
      }

      return addOverlay(input);
    },
    [addOverlay, imageAssets, showImageAssetInRecents],
  );

  const handleCopySelectedOverlay = useCallback(
    (event?: ClipboardEvent) => {
      if (!selectedOverlay) {
        return;
      }

      const writePlan = buildOverlayClipboardWritePlan(
        selectedOverlay,
        imageAssets,
      );

      // Always use event clipboard write since async API fails to write custom format items
      if (event?.clipboardData) {
        writeClipboardPlanToEvent(writePlan, event.clipboardData);
        return;
      }

      void writeClipboardPlanToSystemClipboard(writePlan);
    },
    [imageAssets, selectedOverlay],
  );

  const handleDuplicateSelectedOverlay = useCallback(() => {
    if (!selectedOverlay) {
      return;
    }

    const pageSize = pageSizes[selectedOverlay.pageNumber];

    if (!pageSize) {
      return;
    }

    addRenderableOverlay(
      duplicateOverlayInput(selectedOverlay, {
        pageSize: {
          height: pageSize.height / zoom,
          width: pageSize.width / zoom,
        },
      }),
    );
  }, [addRenderableOverlay, pageSizes, selectedOverlay, zoom]);

  const addPastedImageOverlay = useCallback(
    async (
      image: Blob,
      pageSize: { height: number; width: number },
      sha256Signature?: string,
    ) => {
      const nextSha256Signature =
        sha256Signature ?? (await createImageSha256Signature(image));
      const signature = createImageClipboardSignature(
        image.type,
        nextSha256Signature,
      );

      if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
        return;
      }

      const asset = await addImageBlob(image, nextSha256Signature);
      const overlay = addRenderableOverlay(
        createCenteredImageOverlayInput(asset, currentPage, pageSize),
        { additionalRenderableImageAssetIds: [asset.id] },
      );

      if (overlay) {
        setLastExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    },
    [
      addImageBlob,
      addRenderableOverlay,
      currentPage,
      lastExternalPaste,
      overlays,
    ],
  );

  const getNextOverlayPaste = useCallback(
    (payload: OverlayClipboardPayload) => {
      const payloadKey = getOverlayClipboardPayloadKey(payload);
      const pasteCount =
        lastOverlayPaste?.payloadKey === payloadKey
          ? lastOverlayPaste.pasteCount + 1
          : 1;

      return { pasteCount, payloadKey };
    },
    [lastOverlayPaste],
  );

  const pasteOverlayIntent = useCallback(
    async (
      intent: Extract<PasteIntent, { kind: "overlay" }>,
      pageSize: { height: number; width: number },
    ) => {
      const { pasteCount, payloadKey } = getNextOverlayPaste(intent.payload);
      const input = toOverlayInput(intent.payload, {
        pageNumber: currentPage,
        pageSize,
        pasteCount,
      });
      let renderableInput = input;
      let additionalRenderableImageAssetIds: string[] | undefined;

      if (input.type === "image") {
        const existingAsset = imageAssets.find(
          (asset) => asset.id === input.assetId,
        );

        if (!existingAsset) {
          if (!intent.imageBlob) {
            toast.error("Unable to paste image overlay", {
              description: "The copied image data is not available.",
            });
            return;
          }

          const asset = await addImageBlob(intent.imageBlob);

          renderableInput = {
            ...input,
            assetId: asset.id,
            sha256Signature: asset.sha256Signature,
          };
          additionalRenderableImageAssetIds = [asset.id];
        }
      }

      const overlay = addRenderableOverlay(
        renderableInput,
        additionalRenderableImageAssetIds
          ? { additionalRenderableImageAssetIds }
          : undefined,
      );

      if (overlay) {
        setLastOverlayPaste({ pasteCount, payloadKey });
      }
    },
    [
      addImageBlob,
      addRenderableOverlay,
      currentPage,
      getNextOverlayPaste,
      imageAssets,
    ],
  );

  const pasteExternalTextIntent = useCallback(
    (
      intent: Extract<PasteIntent, { kind: "external-text" }>,
      pageSize: { height: number; width: number },
      textSettings: TextOverlayDefaults,
    ) => {
      const signature = intent.html
        ? createTextClipboardSignature("text/html", intent.html)
        : createTextClipboardSignature("text/plain", intent.text);

      if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
        return;
      }

      const input = intent.html
        ? textOverlayInputFromHtml(intent.html, intent.text, {
            pageNumber: currentPage,
            pageSize,
            textSettings,
          })
        : textOverlayInputFromPlainText(intent.text, {
            pageNumber: currentPage,
            pageSize,
            textSettings,
          });

      if (!input) {
        return;
      }

      const overlay = addRenderableOverlay(input);

      if (overlay) {
        setLastExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    },
    [
      addRenderableOverlay,
      currentPage,
      lastExternalPaste,
      overlays,
      setLastExternalPaste,
    ],
  );

  const pasteTextWithCurrentSettingsIntent = useCallback(
    (
      intent: PasteIntent,
      pageSize: { height: number; width: number },
      textSettings: TextOverlayDefaults,
    ) => {
      const text =
        intent.kind === "overlay" && intent.payload.overlay.type === "text"
          ? intent.payload.overlay.text
          : intent.kind === "external-text"
            ? intent.html
              ? extractPlainTextFromHtml(intent.html) || intent.text
              : intent.text
            : "";

      if (!text) {
        return;
      }

      const signature = createTextClipboardSignature("text/plain", text);

      if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
        return;
      }

      const input = textOverlayInputUsingCurrentSettings(text, {
        pageNumber: currentPage,
        pageSize,
        textSettings,
      });

      if (!input) {
        return;
      }

      const overlay = addRenderableOverlay(input);

      if (overlay) {
        setLastExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    },
    [
      addRenderableOverlay,
      currentPage,
      lastExternalPaste,
      overlays,
      setLastExternalPaste,
    ],
  );

  const handlePasteIntent = useCallback(
    (intent: PasteIntent) => {
      const pageSize = getCurrentPageSize();

      if (!pageSize || intent.kind === "empty") {
        return;
      }

      const paste = async () => {
        try {
          if (intent.kind === "overlay") {
            await pasteOverlayIntent(intent, pageSize);
            return;
          }

          if (intent.kind === "external-image") {
            await addPastedImageOverlay(intent.blob, pageSize);
            return;
          }

          pasteExternalTextIntent(intent, pageSize, getCurrentTextDefaults());
        } catch (error) {
          toast.error("Unable to paste", {
            description:
              error instanceof Error
                ? error.message
                : "Copy another item and try again.",
          });
        }
      };

      void paste();
    },
    [
      addPastedImageOverlay,
      getCurrentPageSize,
      getCurrentTextDefaults,
      pasteExternalTextIntent,
      pasteOverlayIntent,
    ],
  );

  const handlePasteEvent = useCallback(
    (event: ClipboardEvent) => {
      const intent = readPasteIntentFromClipboardData(event.clipboardData);

      if (intent.kind === "empty") {
        return;
      }

      event.preventDefault();
      handlePasteIntent(intent);
    },
    [handlePasteIntent],
  );

  const handlePasteWithCurrentTextSettings = useCallback(() => {
    const pageSize = getCurrentPageSize();

    if (!pageSize) {
      return;
    }

    const paste = async () => {
      const intent = await readPasteIntentFromAsyncClipboard();

      pasteTextWithCurrentSettingsIntent(
        intent,
        pageSize,
        getCurrentTextDefaults(),
      );
    };

    void paste();
  }, [
    getCurrentPageSize,
    getCurrentTextDefaults,
    pasteTextWithCurrentSettingsIntent,
  ]);

  useEditorKeyboardShortcuts({
    editingOverlayId,
    hasActiveTool: activeTool !== null,
    onClearActiveTool: handleClearActiveTool,
    onClearSelection: handleClearSelection,
    onCopySelectedOverlay: handleCopySelectedOverlay,
    onDuplicateSelectedOverlay: handleDuplicateSelectedOverlay,
    onEditOverlay: handleEditOverlay,
    onPasteEvent: handlePasteEvent,
    onPasteWithCurrentTextSettings: handlePasteWithCurrentTextSettings,
    onRemoveOverlay: removeOverlay,
    onUpdateOverlayRect: updateOverlayRect,
    pageSizes,
    scale: zoom,
    selectedOverlay,
  });

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const replacePdfFile = useCallback(
    (file: File) => {
      setCurrentPage(1);
      clearOverlays();
      setLastOverlayPaste(null);
      setLastExternalPaste(null);
      setEditingOverlayId(null);
      setActiveTool(null);
      setPageSizes({});
      exportedFileNamesRef.current = new Set();
      void openFile(file);
    },
    [clearOverlays, openFile],
  );

  const handleConfirmCloseDraft = useCallback(() => {
    setIsCloseDraftDialogOpen(false);
    setPendingReplacementPdfFile(null);
    setCurrentPage(1);
    clearFile();
    clearOverlays();
    setLastOverlayPaste(null);
    setLastExternalPaste(null);
    setEditingOverlayId(null);
    setActiveTool(null);
    setPageSizes({});
    setScrollToPageRequest(null);
    exportedFileNamesRef.current = new Set();
    void clearStoredDraft().catch(() => {
      // Closing the visible draft should not be blocked by storage errors.
    });
  }, [clearFile, clearOverlays, clearStoredDraft]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    replacePdfFile(file);
  };

  const handleExportPdf = async () => {
    if (!loadedDocument || isExporting) {
      return;
    }

    setIsExporting(true);
    setEditingOverlayId(null);

    try {
      const fileName = createExportFileName(
        loadedDocument.fileName,
        exportedFileNamesRef.current,
      );
      const exportedBytes = await exportPdf({
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
  };

  const handleOpenImageDialog = () => {
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    void addImageFile(file).then((asset) => {
      setActiveTool({ assetId: asset.id, type: "image" });
      setEditingOverlayId(null);
    });
  };

  const handleImportImageUrl = async (url: string) => {
    const asset = await addImageUrl(url);

    setActiveTool({ assetId: asset.id, type: "image" });
    setEditingOverlayId(null);
  };

  const handleImportImageFromClipboard = () => {
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
        setEditingOverlayId(null);
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
  };

  const handleDropPdfFile = useCallback(
    (file: File) => {
      if (loadedDocument) {
        setPendingReplacementPdfFile(file);
        return;
      }

      replacePdfFile(file);
    },
    [loadedDocument, replacePdfFile],
  );

  const handleConfirmReplaceDroppedPdf = useCallback(() => {
    const file = pendingReplacementPdfFile;

    if (!file) {
      return;
    }

    setPendingReplacementPdfFile(null);
    replacePdfFile(file);
  }, [pendingReplacementPdfFile, replacePdfFile]);

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
      setPageSizes((currentPageSizes) => ({
        ...currentPageSizes,
        [pageNumber]: pageSize,
      }));
    },
    [],
  );

  const handleTextToolClick = () => {
    setActiveTool((currentTool) =>
      currentTool?.type === "text" ? null : { type: "text" },
    );
    setEditingOverlayId(null);
  };

  const handleMarkToolClick = () => {
    setActiveTool((currentTool) =>
      currentTool?.type === "mark" ? null : { type: "mark" },
    );
    setEditingOverlayId(null);
  };

  const handleMarkToolActivate = () => {
    setActiveTool({ type: "mark" });
    setEditingOverlayId(null);
  };

  const handlePlaceTextOverlay = (pageNumber: number, rect: PdfRect) => {
    setCurrentPage(pageNumber);
    const overlay = addOverlay({
      ...textDefaults,
      pageNumber,
      rect,
      type: "text",
    });
    setActiveTool(null);
    setEditingOverlayId(overlay.id);
  };

  const handlePlaceMarkOverlay = (pageNumber: number, rect: PdfRect) => {
    setCurrentPage(pageNumber);
    addOverlay({
      ...markDefaults,
      pageNumber,
      rect,
      type: "mark",
    });
    setActiveTool(null);
    setEditingOverlayId(null);
  };

  const handlePlaceImageOverlay = (pageNumber: number, rect: PdfRect) => {
    if (!activeImageAsset) {
      return;
    }

    setCurrentPage(pageNumber);
    addOverlay({
      assetId: activeImageAsset.id,
      pageNumber,
      rect,
      sha256Signature: activeImageAsset.sha256Signature,
      type: "image",
    });
    setActiveTool(null);
    setEditingOverlayId(null);
  };

  const handleMarkSettingsChange = (patch: MarkOverlayPatch) => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      markDefaults: {
        ...currentPreferences.markDefaults,
        ...patch,
      },
    }));

    if (selectedMarkOverlay) {
      updateMarkOverlay(selectedMarkOverlay.id, patch);
    }
  };

  const handleMarkSettingsReset = () => {
    updateEditorPreferences({ markDefaults: defaultMarkSettings });

    if (selectedMarkOverlay) {
      updateMarkOverlay(selectedMarkOverlay.id, defaultMarkSettings);
    }
  };

  const handleTextSettingsChange = (patch: TextOverlayPatch) => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      textDefaults: {
        ...currentPreferences.textDefaults,
        ...patch,
      },
    }));

    if (selectedTextOverlay) {
      updateTextOverlay(selectedTextOverlay.id, patch);
    }
  };

  const handleTextSettingsReset = () => {
    const defaultTextPatch = {
      color: defaultTextOverlay.color,
      fontId: defaultTextOverlay.fontId,
      fontSize: defaultTextOverlay.fontSize,
    };

    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      textDefaults: {
        ...currentPreferences.textDefaults,
        ...defaultTextPatch,
      },
    }));

    if (selectedTextOverlay) {
      updateTextOverlay(selectedTextOverlay.id, defaultTextPatch);
    }
  };

  const handleSelectOverlay = (overlayId: string) => {
    selectOverlay(overlayId);
    setEditingOverlayId((currentEditingId) =>
      currentEditingId === overlayId ? currentEditingId : null,
    );
  };

  const handleZoomIn = () => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      zoom: Math.min(
        maxEditorZoom,
        Number((currentPreferences.zoom + zoomStep).toFixed(2)),
      ),
    }));
  };

  const handleZoomOut = () => {
    setEditorPreferences((currentPreferences) => ({
      ...currentPreferences,
      zoom: Math.max(
        minEditorZoom,
        Number((currentPreferences.zoom - zoomStep).toFixed(2)),
      ),
    }));
  };

  const handleSelectSidebarPage = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setScrollToPageRequest((currentRequest) => ({
      pageNumber,
      requestId: (currentRequest?.requestId ?? 0) + 1,
    }));
  };

  return (
    <TooltipProvider>
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
          activeImageAssetId={activeImageAsset?.id ?? null}
          canCloseDraft={Boolean(loadedDocument) || overlays.length > 0}
          fileName={loadedDocument?.fileName ?? null}
          imageAssets={recentImageAssets}
          isDark={isDark}
          isExporting={isExporting}
          isImageToolActive={activeTool?.type === "image"}
          isPagesSidebarOpen={isPagesSidebarOpen}
          isMarkSettingsDefault={isMarkSettingsDefault}
          isMarkToolActive={activeTool?.type === "mark"}
          isTextSettingsDefault={isTextSettingsDefault}
          isTextToolActive={activeTool?.type === "text"}
          markSettings={currentMarkSettings}
          onCloseDraft={() => setIsCloseDraftDialogOpen(true)}
          onExportPdf={handleExportPdf}
          onImportImageUrl={handleImportImageUrl}
          onMarkSettingsChange={handleMarkSettingsChange}
          onMarkSettingsReset={handleMarkSettingsReset}
          onMarkToolActivate={handleMarkToolActivate}
          onMarkToolClick={handleMarkToolClick}
          onImportImageFromClipboard={handleImportImageFromClipboard}
          onOpenFile={handleOpenFileDialog}
          onOpenImageDialog={handleOpenImageDialog}
          onRemoveImageAssetFromRecents={hideImageAssetFromRecents}
          onSelectImageAsset={(assetId) => {
            showImageAssetInRecents(assetId);
            setActiveTool({ assetId, type: "image" });
            setEditingOverlayId(null);
          }}
          onTextSettingsChange={handleTextSettingsChange}
          onTextSettingsReset={handleTextSettingsReset}
          onTextToolClick={handleTextToolClick}
          onTogglePagesSidebar={() =>
            setEditorPreferences((currentPreferences) => ({
              ...currentPreferences,
              isPagesSidebarOpen: !currentPreferences.isPagesSidebarOpen,
            }))
          }
          onToggleTheme={() =>
            updateEditorPreferences({ themeName: isDark ? "light" : "dark" })
          }
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={loadedDocument?.pageCount ?? 0}
          status={displayStatus}
          textSettings={currentTextSettings}
          zoomPercent={Math.round(zoom * 100)}
        />
        <div className="flex min-h-0 flex-1 bg-workspace text-workspace-foreground">
          {isPagesSidebarOpen && (
            <PagesSidebar
              currentPage={currentPage}
              document={loadedDocument}
              imageAssets={imageAssets}
              onSelectPage={handleSelectSidebarPage}
              overlays={overlays}
              pageCount={loadedDocument?.pageCount ?? 0}
            />
          )}
          <DocumentWorkspace
            currentPage={currentPage}
            document={loadedDocument}
            editingOverlayId={editingOverlayId}
            error={error}
            activeImageAsset={activeImageAsset}
            imageAssets={imageAssets}
            isImageToolActive={activeTool?.type === "image"}
            isMarkToolActive={activeTool?.type === "mark"}
            isTextToolActive={activeTool?.type === "text"}
            onClearSelection={handleClearSelection}
            onCurrentPageChange={setCurrentPage}
            onDropImageFile={handleDropImageFile}
            onDropPdfFile={handleDropPdfFile}
            onEditOverlay={handleEditOverlay}
            onOpenFile={handleOpenFileDialog}
            onPageSizeChange={handlePageSizeChange}
            onPlaceImageOverlay={handlePlaceImageOverlay}
            onPlaceMarkOverlay={handlePlaceMarkOverlay}
            onPlaceTextOverlay={handlePlaceTextOverlay}
            onSelectOverlay={handleSelectOverlay}
            onUpdateTextOverlay={updateTextOverlay}
            onUpdateOverlayRect={updateOverlayRect}
            overlays={overlays}
            selectedOverlayId={selectedOverlayId}
            status={displayStatus}
            scrollToPageRequest={scrollToPageRequest}
            zoom={zoom}
          />
        </div>
        <Dialog
          open={Boolean(pendingReplacementPdfFile)}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setPendingReplacementPdfFile(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Replace current PDF?</DialogTitle>
              <DialogDescription>
                Opening {pendingReplacementPdfFile?.name ?? "this PDF"} will
                replace the current PDF. Any unsaved changes will be lost.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleConfirmReplaceDroppedPdf} type="button">
                Replace PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog
          open={isCloseDraftDialogOpen}
          onOpenChange={setIsCloseDraftDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close current draft?</DialogTitle>
              <DialogDescription>
                This will remove the open PDF and local edits from this browser.
                Your original file will not be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleConfirmCloseDraft} type="button">
                Close Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Toaster position="bottom-right" />
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

function createTextClipboardSignature(type: string, text: string) {
  return `${type}:${text}`;
}

function createImageClipboardSignature(
  mimeType: string,
  sha256Signature: string,
) {
  return `image:${mimeType}:${sha256Signature}`;
}

function createCenteredImageOverlayInput(
  asset: Pick<ImageAsset, "height" | "id" | "sha256Signature" | "width">,
  pageNumber: number,
  pageSize: { height: number; width: number },
): EditorOverlayInput {
  return {
    assetId: asset.id,
    pageNumber,
    rect: createImageOverlayRectAtPoint(
      { x: pageSize.width / 2, y: pageSize.height / 2 },
      pageSize,
      asset,
    ),
    sha256Signature: asset.sha256Signature,
    type: "image",
  };
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Please try again.";
}

export { AppShell };

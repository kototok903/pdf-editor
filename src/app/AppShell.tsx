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
  EditorOverlay,
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
import { createImageSha256Signature } from "@/features/editor/lib/image-asset-utils";
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
  APP_OVERLAY_MIME_TYPE,
  duplicateOverlayInput,
  getTextFromOverlayPayload,
  isSameOverlayClipboardPayload,
  parseOverlayClipboardPayload,
  serializeOverlayClipboardPayload,
  toOverlayClipboardPayload,
  toOverlayInput,
  type OverlayClipboardPayload,
} from "@/features/editor/lib/overlay-clipboard";
import { defaultMarkSettings } from "@/features/editor/lib/mark-definitions";
import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";
import { createExportFileName } from "@/features/pdf-export/lib/export-file-name";
import { exportPdf } from "@/features/pdf-export/lib/export-pdf";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

const minZoom = 0.5;
const maxZoom = 2;
const zoomStep = 0.1;
type ActiveTool =
  | { type: "image"; assetId: string }
  | { type: "mark" }
  | { type: "text" }
  | null;
type AddRenderableOverlay = (
  input: EditorOverlayInput,
  options?: { additionalRenderableImageAssetIds?: string[] },
) => EditorOverlay | null;

function AppShell() {
  const exportedFileNamesRef = useRef<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isPagesSidebarOpen, setIsPagesSidebarOpen] = useState(true);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [pendingReplacementPdfFile, setPendingReplacementPdfFile] =
    useState<File | null>(null);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [scrollToPageRequest, setScrollToPageRequest] = useState<{
    pageNumber: number;
    requestId: number;
  } | null>(null);
  const [overlayClipboard, setOverlayClipboard] = useState<{
    pasteCount: number;
    payload: OverlayClipboardPayload;
    sourceOverlayId: string;
  } | null>(null);
  const [lastExternalPaste, setLastExternalPaste] =
    useState<ExternalPasteRecord | null>(null);
  const [markDefaults, setMarkDefaults] = useState(defaultMarkSettings);
  const [textDefaults, setTextDefaults] = useState(defaultTextOverlay);
  const [zoom, setZoom] = useState(1);
  const {
    addOverlay,
    clearOverlays,
    clearSelection,
    overlays,
    removeOverlay,
    selectOverlay,
    selectedOverlayId,
    updateMarkOverlay,
    updateOverlayRect,
    updateTextOverlay,
  } = useEditorOverlays();
  const {
    document: loadedDocument,
    error,
    openFile,
    status,
  } = usePdfDocument();
  const {
    addImageBlob,
    addImageFile,
    addImageUrl,
    hideImageAssetFromRecents,
    imageAssets,
    recentImageAssets,
  } = useImageAssets();

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

  useEffect(() => {
    globalThis.document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const activeImageAsset =
    activeTool?.type === "image"
      ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
      : null;

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

      return addOverlay(input);
    },
    [addOverlay, imageAssets],
  );

  const handleCopySelectedOverlay = useCallback(() => {
    if (!selectedOverlay) {
      return;
    }

    const payload = toOverlayClipboardPayload(selectedOverlay);
    const serializedPayload = serializeOverlayClipboardPayload(payload);

    setOverlayClipboard({
      pasteCount: 0,
      payload,
      sourceOverlayId: selectedOverlay.id,
    });

    void writeOverlayToSystemClipboard(selectedOverlay, serializedPayload);
  }, [selectedOverlay]);

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

  const handlePaste = useCallback(() => {
    const pageSize = getCurrentPageSize();

    if (!pageSize) {
      return;
    }

    const paste = async () => {
      if (overlayClipboard) {
        const shouldUseInternalClipboard =
          await isSystemClipboardStillOverlayPayload(overlayClipboard.payload);

        if (shouldUseInternalClipboard) {
          const pasteCount = overlayClipboard.pasteCount + 1;

          addRenderableOverlay(
            toOverlayInput(overlayClipboard.payload, {
              pageNumber: currentPage,
              pageSize,
              pasteCount,
            }),
          );
          setOverlayClipboard({
            ...overlayClipboard,
            pasteCount,
          });
          return;
        }

        setOverlayClipboard(null);
      }

      await pasteFromSystemClipboard({
        addImageBlob,
        addRenderableOverlay,
        currentPage,
        lastExternalPaste,
        onExternalPaste: setLastExternalPaste,
        overlays,
        pageSize,
        textSettings: getCurrentTextDefaults(),
      });
    };

    void paste();
  }, [
    addImageBlob,
    addRenderableOverlay,
    currentPage,
    getCurrentPageSize,
    getCurrentTextDefaults,
    lastExternalPaste,
    overlayClipboard,
    overlays,
  ]);

  const handlePasteWithCurrentTextSettings = useCallback(() => {
    const pageSize = getCurrentPageSize();

    if (!pageSize) {
      return;
    }

    const paste = async () => {
      const textSettings = getCurrentTextDefaults();

      if (overlayClipboard) {
        const shouldUseInternalClipboard =
          await isSystemClipboardStillOverlayPayload(overlayClipboard.payload);
        const internalOverlayText = shouldUseInternalClipboard
          ? getTextFromOverlayPayload(overlayClipboard.payload)
          : null;

        if (!shouldUseInternalClipboard) {
          setOverlayClipboard(null);
        }

        if (internalOverlayText) {
          const input = textOverlayInputUsingCurrentSettings(
            internalOverlayText,
            {
              pageNumber: currentPage,
              pageSize,
              textSettings,
            },
          );

          if (input) {
            addRenderableOverlay(input);
          }

          return;
        }
      }

      await pasteTextWithCurrentSettingsFromSystemClipboard({
        addRenderableOverlay,
        currentPage,
        lastExternalPaste,
        onExternalPaste: setLastExternalPaste,
        overlays,
        pageSize,
        textSettings,
      });
    };

    void paste();
  }, [
    addRenderableOverlay,
    currentPage,
    getCurrentPageSize,
    getCurrentTextDefaults,
    lastExternalPaste,
    overlayClipboard,
    overlays,
  ]);

  useEditorKeyboardShortcuts({
    editingOverlayId,
    hasActiveTool: activeTool !== null,
    onClearActiveTool: handleClearActiveTool,
    onClearSelection: handleClearSelection,
    onCopySelectedOverlay: handleCopySelectedOverlay,
    onDuplicateSelectedOverlay: handleDuplicateSelectedOverlay,
    onEditOverlay: handleEditOverlay,
    onPaste: handlePaste,
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
      setOverlayClipboard(null);
      setLastExternalPaste(null);
      setEditingOverlayId(null);
      setActiveTool(null);
      setPageSizes({});
      exportedFileNamesRef.current = new Set();
      void openFile(file);
    },
    [clearOverlays, openFile],
  );

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
    setMarkDefaults((currentDefaults) => ({
      ...currentDefaults,
      ...patch,
    }));

    if (selectedMarkOverlay) {
      updateMarkOverlay(selectedMarkOverlay.id, patch);
    }
  };

  const handleMarkSettingsReset = () => {
    setMarkDefaults(defaultMarkSettings);

    if (selectedMarkOverlay) {
      updateMarkOverlay(selectedMarkOverlay.id, defaultMarkSettings);
    }
  };

  const handleTextSettingsChange = (patch: TextOverlayPatch) => {
    setTextDefaults((currentDefaults) => ({
      ...currentDefaults,
      ...patch,
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

    setTextDefaults((currentDefaults) => ({
      ...currentDefaults,
      ...defaultTextPatch,
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
    setZoom((currentZoom) =>
      Math.min(maxZoom, Number((currentZoom + zoomStep).toFixed(2))),
    );
  };

  const handleZoomOut = () => {
    setZoom((currentZoom) =>
      Math.max(minZoom, Number((currentZoom - zoomStep).toFixed(2))),
    );
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
      <main className="flex min-h-screen flex-col bg-background text-foreground">
        <input
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          type="file"
        />
        <input
          accept="image/*,.svg"
          className="hidden"
          onChange={handleImageFileChange}
          ref={imageInputRef}
          type="file"
        />
        <EditorToolbar
          activeImageAssetId={activeImageAsset?.id ?? null}
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
          onExportPdf={handleExportPdf}
          onImportImageUrl={handleImportImageUrl}
          onMarkSettingsChange={handleMarkSettingsChange}
          onMarkSettingsReset={handleMarkSettingsReset}
          onMarkToolActivate={handleMarkToolActivate}
          onMarkToolClick={handleMarkToolClick}
          onOpenFile={handleOpenFileDialog}
          onOpenImageDialog={handleOpenImageDialog}
          onRemoveImageAssetFromRecents={hideImageAssetFromRecents}
          onSelectImageAsset={(assetId) => {
            setActiveTool({ assetId, type: "image" });
            setEditingOverlayId(null);
          }}
          onTextSettingsChange={handleTextSettingsChange}
          onTextSettingsReset={handleTextSettingsReset}
          onTextToolClick={handleTextToolClick}
          onTogglePagesSidebar={() =>
            setIsPagesSidebarOpen((isOpen) => !isOpen)
          }
          onToggleTheme={() => setIsDark(!isDark)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={loadedDocument?.pageCount ?? 0}
          status={status}
          textSettings={currentTextSettings}
          zoomPercent={Math.round(zoom * 100)}
        />
        <div className="flex h-[calc(100vh-3rem)] min-h-0 bg-workspace text-workspace-foreground">
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
            status={status}
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

async function writeOverlayToSystemClipboard(
  overlay: EditorOverlay,
  serializedPayload: string,
) {
  if (!navigator.clipboard) {
    return;
  }

  if ("ClipboardItem" in window && navigator.clipboard.write) {
    try {
      const clipboardData: Record<string, Blob> = {
        [APP_OVERLAY_MIME_TYPE]: new Blob([serializedPayload], {
          type: APP_OVERLAY_MIME_TYPE,
        }),
      };

      if (overlay.type === "text") {
        clipboardData["text/plain"] = new Blob([overlay.text], {
          type: "text/plain",
        });
      }

      await navigator.clipboard.write([new ClipboardItem(clipboardData)]);
      return;
    } catch {
      // Fall back to plain text below.
    }
  }

  try {
    await navigator.clipboard.writeText(
      overlay.type === "text" ? overlay.text : serializedPayload,
    );
  } catch {
    // Clipboard permissions vary by browser; internal copy state still works.
  }
}

async function isSystemClipboardStillOverlayPayload(
  payload: OverlayClipboardPayload,
) {
  if (!navigator.clipboard) {
    return true;
  }

  if ("read" in navigator.clipboard) {
    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        if (item.types.includes(APP_OVERLAY_MIME_TYPE)) {
          const systemPayload = parseOverlayClipboardPayload(
            await blobToText(await item.getType(APP_OVERLAY_MIME_TYPE)),
          );

          return Boolean(
            systemPayload &&
            isSameOverlayClipboardPayload(payload, systemPayload),
          );
        }

        if (
          item.types.some(
            (type) => type.startsWith("image/") || type === "text/html",
          )
        ) {
          return false;
        }

        if (item.types.includes("text/plain")) {
          return textMatchesOverlayClipboardPayload(
            await blobToText(await item.getType("text/plain")),
            payload,
          );
        }
      }
    } catch {
      // Fall back to readText below.
    }
  }

  if (!navigator.clipboard.readText) {
    return true;
  }

  try {
    const text = await navigator.clipboard.readText();

    return text ? textMatchesOverlayClipboardPayload(text, payload) : true;
  } catch {
    return true;
  }
}

function textMatchesOverlayClipboardPayload(
  text: string,
  payload: OverlayClipboardPayload,
) {
  return (
    text === serializeOverlayClipboardPayload(payload) ||
    (payload.overlay.type === "text" && text === payload.overlay.text)
  );
}

async function pasteFromSystemClipboard({
  addImageBlob,
  addRenderableOverlay,
  currentPage,
  lastExternalPaste,
  onExternalPaste,
  overlays,
  pageSize,
  textSettings,
}: {
  addImageBlob: (
    blob: Blob,
    sha256Signature?: string,
  ) => Promise<{
    height: number;
    id: string;
    sha256Signature: string;
    width: number;
  }>;
  addRenderableOverlay: AddRenderableOverlay;
  currentPage: number;
  lastExternalPaste: ExternalPasteRecord | null;
  onExternalPaste: (record: ExternalPasteRecord) => void;
  overlays: EditorOverlay[];
  pageSize: { height: number; width: number };
  textSettings: TextOverlayDefaults;
}) {
  const options = {
    pageNumber: currentPage,
    pageSize,
    textSettings,
  };

  if (navigator.clipboard && "read" in navigator.clipboard) {
    try {
      const items = await navigator.clipboard.read();
      const htmlFallbacks: { fallbackText: string; html: string }[] = [];
      const plainTextFallbacks: string[] = [];

      for (const item of items) {
        const overlayType = item.types.find(
          (type) => type === APP_OVERLAY_MIME_TYPE,
        );

        if (overlayType) {
          const payload = parseOverlayClipboardPayload(
            await blobToText(await item.getType(overlayType)),
          );

          if (payload) {
            const addedOverlay = addRenderableOverlay(
              toOverlayInput(payload, {
                pageNumber: currentPage,
                pageSize,
                pasteCount: 1,
              }),
            );

            if (addedOverlay) {
              return;
            }
          }
        }

        const imageType = item.types.find((type) => type.startsWith("image/"));

        if (imageType) {
          const blob = await item.getType(imageType);
          const sha256Signature = await createImageSha256Signature(blob);
          const signature = createImageClipboardSignature(
            blob.type,
            sha256Signature,
          );

          if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
            return;
          }

          const asset = await addImageBlob(blob, sha256Signature);

          const overlay = addRenderableOverlay(
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

          if (overlay) {
            onExternalPaste(createExternalPasteRecord(overlay, signature));
          }

          return;
        }

        if (item.types.includes("text/html")) {
          const html = await blobToText(await item.getType("text/html"));
          const fallbackText = item.types.includes("text/plain")
            ? await blobToText(await item.getType("text/plain"))
            : "";

          htmlFallbacks.push({ fallbackText, html });
        } else if (item.types.includes("text/plain")) {
          plainTextFallbacks.push(
            await blobToText(await item.getType("text/plain")),
          );
        }
      }

      for (const fallback of htmlFallbacks) {
        const signature = createTextClipboardSignature(
          "text/html",
          fallback.html,
        );

        if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
          return;
        }

        const input = textOverlayInputFromHtml(
          fallback.html,
          fallback.fallbackText,
          options,
        );

        if (input) {
          const overlay = addRenderableOverlay(input);

          if (overlay) {
            onExternalPaste(createExternalPasteRecord(overlay, signature));
          }

          return;
        }
      }

      for (const text of plainTextFallbacks) {
        const overlayPayload = parseOverlayClipboardPayload(text);

        if (overlayPayload) {
          const addedOverlay = addRenderableOverlay(
            toOverlayInput(overlayPayload, {
              pageNumber: currentPage,
              pageSize,
              pasteCount: 1,
            }),
          );

          if (addedOverlay) {
            return;
          }
        }

        const input = textOverlayInputFromPlainText(text, options);

        if (input) {
          const signature = createTextClipboardSignature("text/plain", text);

          if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
            return;
          }

          const overlay = addRenderableOverlay(input);

          if (overlay) {
            onExternalPaste(createExternalPasteRecord(overlay, signature));
          }

          return;
        }
      }
    } catch {
      // Fall back to readText below.
    }
  }

  await pasteTextFromReadText({
    addRenderableOverlay,
    currentPage,
    lastExternalPaste,
    onExternalPaste,
    overlays,
    pageSize,
    textSettings,
  });
}

async function pasteTextWithCurrentSettingsFromSystemClipboard({
  addRenderableOverlay,
  currentPage,
  lastExternalPaste,
  onExternalPaste,
  overlays,
  pageSize,
  textSettings,
}: {
  addRenderableOverlay: AddRenderableOverlay;
  currentPage: number;
  lastExternalPaste: ExternalPasteRecord | null;
  onExternalPaste: (record: ExternalPasteRecord) => void;
  overlays: EditorOverlay[];
  pageSize: { height: number; width: number };
  textSettings: TextOverlayDefaults;
}) {
  if (navigator.clipboard && "read" in navigator.clipboard) {
    try {
      const items = await navigator.clipboard.read();

      for (const item of items) {
        if (item.types.includes("text/html")) {
          const html = await blobToText(await item.getType("text/html"));
          const signature = createTextClipboardSignature("text/html", html);

          if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
            return;
          }

          const text = extractPlainTextFromHtml(html);
          const input = textOverlayInputUsingCurrentSettings(text, {
            pageNumber: currentPage,
            pageSize,
            textSettings,
          });

          if (input) {
            const overlay = addRenderableOverlay(input);

            if (overlay) {
              onExternalPaste(createExternalPasteRecord(overlay, signature));
            }

            return;
          }
        }

        if (item.types.includes("text/plain")) {
          const text = await blobToText(await item.getType("text/plain"));
          const payload = parseOverlayClipboardPayload(text);
          const signature = createTextClipboardSignature("text/plain", text);

          if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
            return;
          }

          const input = textOverlayInputUsingCurrentSettings(
            payload ? (getTextFromOverlayPayload(payload) ?? "") : text,
            {
              pageNumber: currentPage,
              pageSize,
              textSettings,
            },
          );

          if (input) {
            const overlay = addRenderableOverlay(input);

            if (overlay) {
              onExternalPaste(createExternalPasteRecord(overlay, signature));
            }

            return;
          }
        }
      }
    } catch {
      // Fall back to readText below.
    }
  }

  await pasteTextFromReadText({
    addRenderableOverlay,
    currentPage,
    lastExternalPaste,
    onExternalPaste,
    overlays,
    pageSize,
    textSettings,
  });
}

async function pasteTextFromReadText({
  addRenderableOverlay,
  currentPage,
  lastExternalPaste,
  onExternalPaste,
  overlays,
  pageSize,
  textSettings,
}: {
  addRenderableOverlay: AddRenderableOverlay;
  currentPage: number;
  lastExternalPaste: ExternalPasteRecord | null;
  onExternalPaste: (record: ExternalPasteRecord) => void;
  overlays: EditorOverlay[];
  pageSize: { height: number; width: number };
  textSettings: TextOverlayDefaults;
}) {
  if (!navigator.clipboard?.readText) {
    return;
  }

  try {
    const text = await navigator.clipboard.readText();
    const payload = parseOverlayClipboardPayload(text);

    if (payload) {
      const addedOverlay = addRenderableOverlay(
        toOverlayInput(payload, {
          pageNumber: currentPage,
          pageSize,
          pasteCount: 1,
        }),
      );

      if (addedOverlay) {
        return;
      }
    }

    const signature = createTextClipboardSignature("text/plain", text);

    if (shouldSkipExternalPaste(lastExternalPaste, signature, overlays)) {
      return;
    }

    const input = textOverlayInputFromPlainText(text, {
      pageNumber: currentPage,
      pageSize,
      textSettings,
    });

    if (input) {
      const overlay = addRenderableOverlay(input);

      if (overlay) {
        onExternalPaste(createExternalPasteRecord(overlay, signature));
      }
    }
  } catch {
    // Clipboard reads can be blocked outside user activation.
  }
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

function blobToText(blob: Blob) {
  return blob.text();
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Please try again.";
}

export { AppShell };

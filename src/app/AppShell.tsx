import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentWorkspace } from "@/features/editor/components/DocumentWorkspace";
import { EditorToolbar } from "@/features/editor/components/EditorToolbar";
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import type {
  MarkOverlay,
  MarkOverlayPatch,
  PdfRect,
  TextOverlay,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { useEditorKeyboardShortcuts } from "@/features/editor/hooks/useEditorKeyboardShortcuts";
import { useImageAssets } from "@/features/editor/hooks/useImageAssets";
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
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [scrollToPageRequest, setScrollToPageRequest] = useState<{
    pageNumber: number;
    requestId: number;
  } | null>(null);
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

  useEditorKeyboardShortcuts({
    editingOverlayId,
    hasActiveTool: activeTool !== null,
    onClearActiveTool: handleClearActiveTool,
    onClearSelection: handleClearSelection,
    onEditOverlay: handleEditOverlay,
    onRemoveOverlay: removeOverlay,
    onUpdateOverlayRect: updateOverlayRect,
    pageSizes,
    scale: zoom,
    selectedOverlay,
  });

  const handleOpenFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setCurrentPage(1);
    clearOverlays();
    setEditingOverlayId(null);
    setActiveTool(null);
    setPageSizes({});
    exportedFileNamesRef.current = new Set();
    void openFile(file);
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

function getExportErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Please try again.";
}

export { AppShell };

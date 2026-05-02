import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentWorkspace } from "@/features/editor/components/DocumentWorkspace";
import { EditorToolbar } from "@/features/editor/components/EditorToolbar";
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import type {
  PdfRect,
  TextOverlay,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { useImageAssets } from "@/features/editor/hooks/useImageAssets";
import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

const minZoom = 0.5;
const maxZoom = 2;
const zoomStep = 0.1;
type ActiveTool = { type: "image"; assetId: string } | { type: "text" } | null;

function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [, setPageSizes] = useState<Record<number, PageSize>>({});
  const [textDefaults, setTextDefaults] = useState(defaultTextOverlay);
  const [zoom, setZoom] = useState(1);
  const {
    addOverlay,
    clearSelection,
    overlays,
    removeOverlay,
    selectOverlay,
    selectedOverlayId,
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
  const selectedOverlay = useMemo(
    () => overlays.find((overlay) => overlay.id === selectedOverlayId) ?? null,
    [overlays, selectedOverlayId],
  );

  const currentTextSettings = selectedTextOverlay ?? textDefaults;
  const isTextSettingsDefault =
    currentTextSettings.color === defaultTextOverlay.color &&
    currentTextSettings.fontFamily === defaultTextOverlay.fontFamily &&
    currentTextSettings.fontSize === defaultTextOverlay.fontSize;

  useEffect(() => {
    globalThis.document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedOverlay) {
        return;
      }

      const isEditingSelectedText =
        selectedOverlay.type === "text" &&
        editingOverlayId === selectedOverlay.id;

      if (isEditingSelectedText && event.metaKey && event.key === "Enter") {
        event.preventDefault();
        setEditingOverlayId(null);
        return;
      }

      if (isEditingSelectedText || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        removeOverlay(selectedOverlay.id);
        setEditingOverlayId(null);
        return;
      }

      if (selectedOverlay.type === "text" && event.key === "Enter") {
        event.preventDefault();
        setEditingOverlayId(selectedOverlay.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingOverlayId, removeOverlay, selectedOverlay]);

  const activeImageAsset =
    activeTool?.type === "image"
      ? (imageAssets.find((asset) => asset.id === activeTool.assetId) ?? null)
      : null;

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
    setEditingOverlayId(null);
    setActiveTool(null);
    setPageSizes({});
    void openFile(file);
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
      fontFamily: defaultTextOverlay.fontFamily,
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

  const handleClearSelection = () => {
    clearSelection();
    setEditingOverlayId(null);
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
          isImageToolActive={activeTool?.type === "image"}
          onOpenFile={handleOpenFileDialog}
          isTextSettingsDefault={isTextSettingsDefault}
          isTextToolActive={activeTool?.type === "text"}
          onImportImageUrl={handleImportImageUrl}
          onOpenImageDialog={handleOpenImageDialog}
          onRemoveImageAssetFromRecents={hideImageAssetFromRecents}
          onSelectImageAsset={(assetId) => {
            setActiveTool({ assetId, type: "image" });
            setEditingOverlayId(null);
          }}
          onTextSettingsChange={handleTextSettingsChange}
          onTextSettingsReset={handleTextSettingsReset}
          onTextToolClick={handleTextToolClick}
          onToggleTheme={() => setIsDark(!isDark)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={loadedDocument?.pageCount ?? 0}
          status={status}
          textSettings={currentTextSettings}
          zoomPercent={Math.round(zoom * 100)}
        />
        <div className="flex h-[calc(100vh-3rem)] min-h-0 bg-workspace text-workspace-foreground">
          <PagesSidebar
            currentPage={currentPage}
            pageCount={loadedDocument?.pageCount ?? 0}
          />
          <DocumentWorkspace
            document={loadedDocument}
            editingOverlayId={editingOverlayId}
            error={error}
            activeImageAsset={activeImageAsset}
            imageAssets={imageAssets}
            isImageToolActive={activeTool?.type === "image"}
            isTextToolActive={activeTool?.type === "text"}
            onClearSelection={handleClearSelection}
            onEditOverlay={setEditingOverlayId}
            onOpenFile={handleOpenFileDialog}
            onPageSizeChange={handlePageSizeChange}
            onPlaceImageOverlay={handlePlaceImageOverlay}
            onPlaceTextOverlay={handlePlaceTextOverlay}
            onSelectOverlay={handleSelectOverlay}
            onUpdateTextOverlay={updateTextOverlay}
            onUpdateOverlayRect={updateOverlayRect}
            overlays={overlays}
            selectedOverlayId={selectedOverlayId}
            status={status}
            zoom={zoom}
          />
        </div>
      </main>
    </TooltipProvider>
  );
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.isContentEditable ||
    target.closest(
      "input, textarea, select, [role='textbox'], [role='spinbutton']",
    ),
  );
}

export { AppShell };

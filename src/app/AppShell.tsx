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
  TextOverlay,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { defaultTextOverlay } from "@/features/editor/lib/overlay-defaults";
import { createDefaultOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

const minZoom = 0.5;
const maxZoom = 2;
const zoomStep = 0.1;

function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
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

  const selectedTextOverlay = useMemo(
    () =>
      overlays.find(
        (overlay): overlay is TextOverlay =>
          overlay.id === selectedOverlayId && overlay.type === "text",
      ) ?? null,
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
      if (!selectedTextOverlay) {
        return;
      }

      const isEditingSelectedText = editingOverlayId === selectedTextOverlay.id;

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
        removeOverlay(selectedTextOverlay.id);
        setEditingOverlayId(null);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        setEditingOverlayId(selectedTextOverlay.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [editingOverlayId, removeOverlay, selectedTextOverlay]);

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
    setPageSizes({});
    void openFile(file);
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
    const pageSize = pageSizes[currentPage];

    if (!pageSize) {
      return;
    }

    addOverlay({
      ...textDefaults,
      pageNumber: currentPage,
      rect: createDefaultOverlayRect(pageSize),
      type: "text",
    });
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
        <EditorToolbar
          fileName={loadedDocument?.fileName ?? null}
          isDark={isDark}
          onOpenFile={handleOpenFileDialog}
          onTextSettingsChange={handleTextSettingsChange}
          onTextSettingsReset={handleTextSettingsReset}
          onTextToolClick={handleTextToolClick}
          onToggleTheme={() => setIsDark(!isDark)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          isTextSettingsDefault={isTextSettingsDefault}
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
            onClearSelection={handleClearSelection}
            onEditOverlay={setEditingOverlayId}
            onOpenFile={handleOpenFileDialog}
            onPageSizeChange={handlePageSizeChange}
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

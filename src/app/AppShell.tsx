import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentWorkspace } from "@/features/editor/components/DocumentWorkspace";
import { EditorToolbar } from "@/features/editor/components/EditorToolbar";
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import { useEditorOverlays } from "@/features/editor/hooks/useEditorOverlays";
import { createDefaultOverlayRect } from "@/features/editor/lib/overlay-coordinate-utils";
import type { PageSize } from "@/features/pdf/components/PdfPageView";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

const minZoom = 0.5;
const maxZoom = 2;
const zoomStep = 0.1;

function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDark, setIsDark] = useState(false);
  const [pageSizes, setPageSizes] = useState<Record<number, PageSize>>({});
  const [zoom, setZoom] = useState(1);
  const {
    addOverlay,
    clearSelection,
    overlays,
    selectOverlay,
    selectedOverlayId,
    updateOverlayRect,
  } = useEditorOverlays();
  const {
    document: loadedDocument,
    error,
    openFile,
    status,
  } = usePdfDocument();

  useEffect(() => {
    globalThis.document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

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
      pageNumber: currentPage,
      rect: createDefaultOverlayRect(pageSize),
      type: "text",
    });
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
          onTextToolClick={handleTextToolClick}
          onToggleTheme={() => setIsDark(!isDark)}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          pageCount={loadedDocument?.pageCount ?? 0}
          status={status}
          zoomPercent={Math.round(zoom * 100)}
        />
        <div className="flex h-[calc(100vh-3rem)] min-h-0 bg-workspace text-workspace-foreground">
          <PagesSidebar
            currentPage={currentPage}
            pageCount={loadedDocument?.pageCount ?? 0}
          />
          <DocumentWorkspace
            document={loadedDocument}
            error={error}
            onClearSelection={clearSelection}
            onOpenFile={handleOpenFileDialog}
            onPageSizeChange={handlePageSizeChange}
            onSelectOverlay={selectOverlay}
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

export { AppShell };

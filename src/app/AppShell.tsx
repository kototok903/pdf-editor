import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentWorkspace } from "@/features/editor/components/DocumentWorkspace";
import { EditorToolbar } from "@/features/editor/components/EditorToolbar";
import { PagesSidebar } from "@/features/editor/components/PagesSidebar";
import { usePdfDocument } from "@/features/pdf/hooks/usePdfDocument";

const minZoom = 0.5;
const maxZoom = 2;
const zoomStep = 0.1;

function AppShell() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDark, setIsDark] = useState(false);
  const [zoom, setZoom] = useState(1);
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
    void openFile(file);
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
            onOpenFile={handleOpenFileDialog}
            status={status}
            zoom={zoom}
          />
        </div>
      </main>
    </TooltipProvider>
  );
}

export { AppShell };

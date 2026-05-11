import { useCallback, useEffect, useRef, useState } from "react";

import { OverlayLayer } from "@/features/editor/components/OverlayLayer";
import type {
  EditorOverlay,
  ImageAsset,
  PdfRect,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

type PdfPageViewProps = {
  activeImageAsset: ImageAsset | null;
  editingOverlayId: string | null;
  imageAssets: ImageAsset[];
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
  onCancelActiveTool: () => void;
  onClearSelection: () => void;
  onEditOverlay: (overlayId: string | null) => void;
  onPageElementChange: (
    pageNumber: number,
    element: HTMLElement | null,
  ) => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceWhiteoutOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  overlays: EditorOverlay[];
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  scale: number;
  selectedOverlayId: string | null;
  whiteoutColor: string;
};

type PageSize = {
  height: number;
  width: number;
};

function PdfPageView({
  activeImageAsset,
  editingOverlayId,
  imageAssets,
  isImageToolActive,
  isMarkToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
  onCancelActiveTool,
  onClearSelection,
  onEditOverlay,
  onPageElementChange,
  onPageSizeChange,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceTextOverlay,
  onPlaceWhiteoutOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  overlays,
  pageNumber,
  pdfDocument,
  scale,
  selectedOverlayId,
  whiteoutColor,
}: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [pageSize, setPageSize] = useState<PageSize | null>(null);
  const articleRef = useCallback(
    (element: HTMLElement | null) => {
      onPageElementChange(pageNumber, element);
    },
    [onPageElementChange, pageNumber],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null =
      null;

    if (!canvas) {
      return;
    }

    const canvasElement = canvas;

    setError(null);
    setIsRendering(true);

    async function renderPage() {
      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (isCancelled) {
          return;
        }

        const viewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const canvasContext = canvasElement.getContext("2d");

        if (!canvasContext) {
          throw new Error("Canvas rendering is not supported in this browser.");
        }

        canvasElement.width = Math.floor(viewport.width * outputScale);
        canvasElement.height = Math.floor(viewport.height * outputScale);
        canvasElement.style.width = `${viewport.width}px`;
        canvasElement.style.height = `${viewport.height}px`;
        const nextPageSize = { height: viewport.height, width: viewport.width };
        setPageSize(nextPageSize);
        onPageSizeChange(pageNumber, nextPageSize);

        renderTask = page.render({
          canvas: canvasElement,
          canvasContext,
          transform:
            outputScale === 1
              ? undefined
              : [outputScale, 0, 0, outputScale, 0, 0],
          viewport,
        });

        await renderTask.promise;

        if (!isCancelled) {
          setIsRendering(false);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (
          error instanceof Error &&
          error.name === "RenderingCancelledException"
        ) {
          return;
        }

        setError("Unable to render this page.");
        setIsRendering(false);
      }
    }

    void renderPage();

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [onPageSizeChange, pageNumber, pdfDocument, scale]);

  return (
    <article
      className="relative mx-auto overflow-hidden border bg-page text-page-foreground shadow-page"
      ref={articleRef}
      style={{
        minHeight: pageSize?.height,
        width: pageSize?.width ?? 430,
      }}
    >
      {isRendering && (
        <div className="absolute inset-0 grid place-items-center bg-page text-xs text-slate-500">
          Rendering page {pageNumber}
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-page px-6 text-center text-sm text-red-700">
          {error}
        </div>
      )}
      <canvas ref={canvasRef} />
      {pageSize && (
        <OverlayLayer
          activeImageAsset={activeImageAsset}
          editingOverlayId={editingOverlayId}
          imageAssets={imageAssets}
          isImageToolActive={isImageToolActive}
          isMarkToolActive={isMarkToolActive}
          isTextToolActive={isTextToolActive}
          isWhiteoutToolActive={isWhiteoutToolActive}
          onCancelActiveTool={onCancelActiveTool}
          onClearSelection={onClearSelection}
          onEditOverlay={onEditOverlay}
          onPlaceImageOverlay={onPlaceImageOverlay}
          onPlaceMarkOverlay={onPlaceMarkOverlay}
          onPlaceTextOverlay={onPlaceTextOverlay}
          onPlaceWhiteoutOverlay={onPlaceWhiteoutOverlay}
          onSelectOverlay={onSelectOverlay}
          onUpdateTextOverlay={onUpdateTextOverlay}
          onUpdateOverlayRect={onUpdateOverlayRect}
          overlays={overlays}
          pageNumber={pageNumber}
          scale={scale}
          selectedOverlayId={selectedOverlayId}
          whiteoutColor={whiteoutColor}
        />
      )}
    </article>
  );
}

export { PdfPageView };
export type { PageSize };

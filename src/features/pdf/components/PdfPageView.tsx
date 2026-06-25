import { memo, useCallback, useEffect, useRef, useState } from "react";
import { AnnotationMode } from "pdfjs-dist";

import { OverlayLayer } from "@/features/editor/components/OverlayLayer";
import type {
  DocumentPageId,
  EditorFormEdits,
  EditorOverlay,
  ImageAsset,
  PdfRect,
  PdfFormValue,
  TextOverlayPatch,
} from "@/features/editor/editor-types";
import { PdfAnnotationLayer } from "@/features/pdf/components/PdfAnnotationLayer";
import { PdfTextLayer } from "@/features/pdf/components/PdfTextLayer";
import { shouldClearOverlaySelectionOnPagePointerDown } from "@/features/pdf/lib/page-pointer-events";
import {
  cleanupPdfRender,
  type PdfRenderTask,
} from "@/features/pdf/lib/pdf-render-cleanup";
import type { PdfFormWidget } from "@/features/pdf/lib/pdf-form-metadata";
import type {
  PageSize,
  PDFDocumentProxy,
  PDFPageProxy,
} from "@/features/pdf/pdf-types";

type PdfPageViewProps = {
  activeImageAsset: ImageAsset | null;
  activeSignatureAsset: ImageAsset | null;
  editingOverlayId: string | null;
  formEdits: EditorFormEdits;
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isImageToolActive: boolean;
  isMarkToolActive: boolean;
  isSignatureToolActive: boolean;
  isTextToolActive: boolean;
  isWhiteoutToolActive: boolean;
  onCancelActiveTool: () => void;
  onClearSelection: () => void;
  onCommitFormValue: (value: PdfFormValue) => void;
  onEditOverlay: (overlayId: string | null) => void;
  onFormWidgetsChange: (pageId: string, widgets: PdfFormWidget[]) => void;
  onPageElementChange: (
    pageNumber: number,
    element: HTMLElement | null,
  ) => void;
  onPageSizeChange: (pageNumber: number, pageSize: PageSize) => void;
  onPlaceImageOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceMarkOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceSignatureOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceTextOverlay: (pageNumber: number, rect: PdfRect) => void;
  onPlaceWhiteoutOverlay: (pageNumber: number, rect: PdfRect) => void;
  onSelectOverlay: (overlayId: string) => void;
  onUpdateTextOverlay: (overlayId: string, patch: TextOverlayPatch) => void;
  onUpdateOverlayRect: (overlayId: string, rect: PdfRect) => void;
  onUpdateOverlayRotation: (overlayId: string, rotationDegrees: number) => void;
  pageOverlays: EditorOverlay[];
  pageId: DocumentPageId;
  pageSize: PageSize;
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  scale: number;
  selectedOverlayId: string | null;
  shouldRender: boolean;
  sourcePageNumber: number;
  whiteoutColor: string;
};

const PdfPageView = memo(function PdfPageView({
  activeImageAsset,
  activeSignatureAsset,
  editingOverlayId,
  formEdits,
  imageAssetById,
  isImageToolActive,
  isMarkToolActive,
  isSignatureToolActive,
  isTextToolActive,
  isWhiteoutToolActive,
  onCancelActiveTool,
  onClearSelection,
  onCommitFormValue,
  onEditOverlay,
  onFormWidgetsChange,
  onPageElementChange,
  onPageSizeChange,
  onPlaceImageOverlay,
  onPlaceMarkOverlay,
  onPlaceSignatureOverlay,
  onPlaceTextOverlay,
  onPlaceWhiteoutOverlay,
  onSelectOverlay,
  onUpdateTextOverlay,
  onUpdateOverlayRect,
  onUpdateOverlayRotation,
  pageOverlays,
  pageId,
  pageSize,
  pageNumber,
  pdfDocument,
  scale,
  selectedOverlayId,
  shouldRender,
  sourcePageNumber,
  whiteoutColor,
}: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const displayPageSize = pageSize;
  const isCurrentRenderState =
    renderState?.pageNumber === pageNumber &&
    renderState.sourcePageNumber === sourcePageNumber &&
    renderState.pdfDocument === pdfDocument &&
    renderState.scale === scale;
  const error =
    isCurrentRenderState && renderState.status === "error"
      ? "Unable to render this page."
      : null;
  const isRendering = shouldRender && !isCurrentRenderState;
  const articleRef = useCallback(
    (element: HTMLElement | null) => {
      onPageElementChange(pageNumber, element);
    },
    [onPageElementChange, pageNumber],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    let isCancelled = false;
    let page: PDFPageProxy | null = null;
    let renderTask: PdfRenderTask | null = null;

    if (!canvas) {
      return;
    }

    if (!shouldRender) {
      return;
    }

    const canvasElement = canvas;

    async function renderPage() {
      try {
        page = await pdfDocument.getPage(sourcePageNumber);

        if (isCancelled) {
          try {
            page.cleanup();
          } catch {
            // The document-level destroy path still releases remaining resources.
          }
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
        onPageSizeChange(pageNumber, nextPageSize);

        renderTask = page.render({
          annotationMode: AnnotationMode.DISABLE,
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
          setRenderState({
            pageNumber,
            pdfDocument,
            scale,
            sourcePageNumber,
            status: "rendered",
          });
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

        setRenderState({
          pageNumber,
          pdfDocument,
          scale,
          sourcePageNumber,
          status: "error",
        });
      }
    }

    void renderPage();

    return () => {
      isCancelled = true;
      cleanupPdfRender({
        canvas: canvasElement,
        page,
        renderTask,
      });
      setRenderState(null);
    };
  }, [
    onPageSizeChange,
    pageNumber,
    pdfDocument,
    scale,
    shouldRender,
    sourcePageNumber,
  ]);

  return (
    <article
      className="relative mx-auto overflow-hidden border bg-page text-page-foreground shadow-page"
      onPointerDownCapture={(event) => {
        if (
          shouldClearOverlaySelectionOnPagePointerDown({
            button: event.button,
            currentTarget: event.currentTarget,
            target: event.target,
          })
        ) {
          onClearSelection();
          onEditOverlay(null);
        }
      }}
      ref={articleRef}
      style={{
        boxSizing: "content-box",
        minHeight: displayPageSize.height,
        width: displayPageSize.width,
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
      <canvas className="relative z-0 block" ref={canvasRef} />
      <PdfTextLayer
        pdfDocument={pdfDocument}
        scale={scale}
        shouldRender={shouldRender}
        sourcePageNumber={sourcePageNumber}
      />
      <PdfAnnotationLayer
        formEdits={formEdits}
        onCommitFormValue={onCommitFormValue}
        onFormWidgetsChange={onFormWidgetsChange}
        pageId={pageId}
        pageNumber={pageNumber}
        pdfDocument={pdfDocument}
        scale={scale}
        shouldRender={shouldRender}
        sourcePageNumber={sourcePageNumber}
      />
      {displayPageSize && (
        <OverlayLayer
          activeImageAsset={activeImageAsset}
          activeSignatureAsset={activeSignatureAsset}
          editingOverlayId={editingOverlayId}
          imageAssetById={imageAssetById}
          isImageToolActive={isImageToolActive}
          isMarkToolActive={isMarkToolActive}
          isSignatureToolActive={isSignatureToolActive}
          isTextToolActive={isTextToolActive}
          isWhiteoutToolActive={isWhiteoutToolActive}
          onCancelActiveTool={onCancelActiveTool}
          onClearSelection={onClearSelection}
          onEditOverlay={onEditOverlay}
          onPlaceImageOverlay={onPlaceImageOverlay}
          onPlaceMarkOverlay={onPlaceMarkOverlay}
          onPlaceSignatureOverlay={onPlaceSignatureOverlay}
          onPlaceTextOverlay={onPlaceTextOverlay}
          onPlaceWhiteoutOverlay={onPlaceWhiteoutOverlay}
          onSelectOverlay={onSelectOverlay}
          onUpdateTextOverlay={onUpdateTextOverlay}
          onUpdateOverlayRect={onUpdateOverlayRect}
          onUpdateOverlayRotation={onUpdateOverlayRotation}
          pageOverlays={pageOverlays}
          pageNumber={pageNumber}
          scale={scale}
          selectedOverlayId={selectedOverlayId}
          whiteoutColor={whiteoutColor}
        />
      )}
    </article>
  );
});

PdfPageView.displayName = "PdfPageView";

type RenderState = {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  scale: number;
  sourcePageNumber: number;
  status: "error" | "rendered";
};

export { PdfPageView };

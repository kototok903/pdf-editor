import { memo, useEffect, useRef, useState } from "react";

import { MarkGlyph } from "@/features/editor/components/MarkGlyph";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { getOverlayRotationDegrees } from "@/features/editor/lib/overlay-capabilities";
import { pdfRectToViewportRect } from "@/features/editor/lib/overlay-coordinate-utils";
import { getTextFontFamily } from "@/features/editor/lib/text-fonts";
import {
  cleanupPdfPageResources,
  cleanupPdfRender,
  type PdfRenderTask,
} from "@/features/pdf/lib/pdf-render-cleanup";
import type { PDFDocumentProxy, PDFPageProxy } from "@/features/pdf/pdf-types";

type PdfPageThumbnailProps = {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  pageOverlays: EditorOverlay[];
  pageRotationDegrees?: number;
  pdfDocument: PDFDocumentProxy;
  shouldRender: boolean;
  sourcePageNumber: number;
  width?: number;
};

type ThumbnailState = {
  height: number;
  scale: number;
  width: number;
};

type RenderState = {
  pageRotationDegrees: number;
  pdfDocument: PDFDocumentProxy;
  sourcePageNumber: number;
  status: "error" | "rendered";
};

const PdfPageThumbnail = memo(function PdfPageThumbnail({
  imageAssetById,
  pageOverlays,
  pageRotationDegrees = 0,
  pdfDocument,
  shouldRender,
  sourcePageNumber,
  width = defaultThumbnailWidth,
}: PdfPageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const [thumbnailState, setThumbnailState] = useState<ThumbnailState | null>(
    null,
  );
  const isCurrentRenderState =
    renderState?.pageRotationDegrees === pageRotationDegrees &&
    renderState.sourcePageNumber === sourcePageNumber &&
    renderState.pdfDocument === pdfDocument;
  const error =
    isCurrentRenderState && renderState.status === "error"
      ? "Unable to render preview."
      : null;
  const isRendering = shouldRender && !thumbnailState && !isCurrentRenderState;

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

    async function renderThumbnail() {
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

        const baseViewport = page.getViewport({
          rotation: page.rotate + pageRotationDegrees,
          scale: 1,
        });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({
          rotation: page.rotate + pageRotationDegrees,
          scale,
        });
        const outputScale = window.devicePixelRatio || 1;
        const canvasContext = canvasElement.getContext("2d");

        if (!canvasContext) {
          throw new Error("Canvas rendering is not supported in this browser.");
        }

        canvasElement.width = Math.floor(viewport.width * outputScale);
        canvasElement.height = Math.floor(viewport.height * outputScale);
        canvasElement.style.width = `${viewport.width}px`;
        canvasElement.style.height = `${viewport.height}px`;
        setThumbnailState({
          height: viewport.height,
          scale,
          width: viewport.width,
        });

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
          setRenderState({
            pageRotationDegrees,
            pdfDocument,
            sourcePageNumber,
            status: "rendered",
          });
          cleanupPdfPageResources(page);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (isExpectedPdfTeardownError(error)) {
          return;
        }

        setRenderState({
          pageRotationDegrees,
          pdfDocument,
          sourcePageNumber,
          status: "error",
        });
      }
    }

    void renderThumbnail();

    return () => {
      isCancelled = true;
      cleanupPdfRender({
        canvas: canvasElement,
        page,
        releaseCanvas: false,
        renderTask,
      });
    };
  }, [pageRotationDegrees, pdfDocument, shouldRender, sourcePageNumber, width]);

  return (
    <div
      className="relative overflow-hidden bg-page"
      style={{
        height: thumbnailState?.height ?? thumbnailPlaceholderHeight,
        width: thumbnailState?.width ?? width,
      }}
    >
      <canvas className="block" ref={canvasRef} />
      {thumbnailState && (
        <ThumbnailOverlayLayer
          imageAssetById={imageAssetById}
          pageOverlays={pageOverlays}
          scale={thumbnailState.scale}
        />
      )}
      {isRendering && (
        <div className="absolute inset-0 grid place-items-center bg-page text-[10px] text-muted-foreground">
          Rendering
        </div>
      )}
      {error && (
        <div className="absolute inset-0 grid place-items-center bg-page px-2 text-center text-[10px] text-red-700">
          {error}
        </div>
      )}
    </div>
  );
});

PdfPageThumbnail.displayName = "PdfPageThumbnail";

function ThumbnailOverlayLayer({
  imageAssetById,
  pageOverlays,
  scale,
}: {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  pageOverlays: EditorOverlay[];
  scale: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {pageOverlays.map((overlay) => {
        const viewportRect = pdfRectToViewportRect(overlay.rect, scale);

        return (
          <div
            className="absolute overflow-hidden"
            key={overlay.id}
            style={{
              height: viewportRect.height,
              left: viewportRect.x,
              top: viewportRect.y,
              transform: getOverlayTransform(overlay),
              transformOrigin: "center center",
              width: viewportRect.width,
            }}
          >
            <ThumbnailOverlay
              imageAssetById={imageAssetById}
              overlay={overlay}
              scale={scale}
            />
          </div>
        );
      })}
    </div>
  );
}

function getOverlayTransform(overlay: EditorOverlay) {
  const rotationDegrees = getOverlayRotationDegrees(overlay);

  return rotationDegrees === 0 ? undefined : `rotate(${rotationDegrees}deg)`;
}

function ThumbnailOverlay({
  imageAssetById,
  overlay,
  scale,
}: {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  overlay: EditorOverlay;
  scale: number;
}) {
  switch (overlay.type) {
    case "text": {
      return (
        <div
          className="h-full w-full overflow-hidden whitespace-pre-wrap bg-transparent p-0 leading-tight"
          style={{
            color: overlay.color,
            fontFamily: getTextFontFamily(overlay.fontId),
            fontSize: overlay.fontSize * scale,
            fontSynthesisWeight: "none",
          }}
        >
          {overlay.text}
        </div>
      );
    }
    case "image": {
      const asset = imageAssetById.get(overlay.assetId);
      return asset ? (
        <img
          alt=""
          className="h-full w-full object-fill"
          draggable={false}
          src={asset.objectUrl}
        />
      ) : null;
    }
    case "mark": {
      return (
        <MarkGlyph
          className="h-full w-full"
          color={overlay.color}
          markType={overlay.markType}
        />
      );
    }
    case "whiteout": {
      return (
        <div
          className="h-full w-full"
          style={{ backgroundColor: overlay.color }}
        />
      );
    }
    default: {
      return <div className="h-full w-full bg-primary/10" />;
    }
  }
}

function isExpectedPdfTeardownError(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "RenderingCancelledException" ||
      error.message === "Transport destroyed")
  );
}

const defaultThumbnailWidth = 60;
const thumbnailPlaceholderHeight = 78;

export { PdfPageThumbnail };

import { useEffect, useRef, useState } from "react";

import { MarkGlyph } from "@/features/editor/components/MarkGlyph";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import { pdfRectToViewportRect } from "@/features/editor/lib/overlay-coordinate-utils";
import { getTextFontFamily } from "@/features/editor/lib/text-fonts";
import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

type PdfPageThumbnailProps = {
  imageAssets: ImageAsset[];
  overlays: EditorOverlay[];
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  shouldRender: boolean;
};

type ThumbnailState = {
  height: number;
  scale: number;
  width: number;
};

type RenderState = {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  status: "error" | "rendered";
};

function PdfPageThumbnail({
  imageAssets,
  overlays,
  pageNumber,
  pdfDocument,
  shouldRender,
}: PdfPageThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderState, setRenderState] = useState<RenderState | null>(null);
  const [thumbnailState, setThumbnailState] = useState<ThumbnailState | null>(
    null,
  );
  const isCurrentRenderState =
    renderState?.pageNumber === pageNumber &&
    renderState.pdfDocument === pdfDocument;
  const error =
    isCurrentRenderState && renderState.status === "error"
      ? "Unable to render preview."
      : null;
  const isRendering = shouldRender && !isCurrentRenderState;

  useEffect(() => {
    const canvas = canvasRef.current;
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null =
      null;

    if (!canvas) {
      return;
    }

    if (!shouldRender) {
      return;
    }

    const canvasElement = canvas;

    async function renderThumbnail() {
      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (isCancelled) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const scale = thumbnailWidth / baseViewport.width;
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
            pageNumber,
            pdfDocument,
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
          status: "error",
        });
      }
    }

    void renderThumbnail();

    return () => {
      isCancelled = true;
      renderTask?.cancel();
    };
  }, [pageNumber, pdfDocument, shouldRender]);

  return (
    <div
      className="relative overflow-hidden rounded-[inherit] bg-page"
      style={{
        height: thumbnailState?.height ?? thumbnailPlaceholderHeight,
        width: thumbnailState?.width ?? thumbnailWidth,
      }}
    >
      <canvas className="block" ref={canvasRef} />
      {thumbnailState && (
        <ThumbnailOverlayLayer
          imageAssets={imageAssets}
          overlays={overlays}
          pageNumber={pageNumber}
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
}

function ThumbnailOverlayLayer({
  imageAssets,
  overlays,
  pageNumber,
  scale,
}: {
  imageAssets: ImageAsset[];
  overlays: EditorOverlay[];
  pageNumber: number;
  scale: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {overlays
        .filter((overlay) => overlay.pageNumber === pageNumber)
        .map((overlay) => {
          const viewportRect = pdfRectToViewportRect(overlay.rect, scale);

          return (
            <div
              className="absolute overflow-hidden"
              key={overlay.id}
              style={{
                height: viewportRect.height,
                left: viewportRect.x,
                top: viewportRect.y,
                width: viewportRect.width,
              }}
            >
              <ThumbnailOverlay
                imageAssets={imageAssets}
                overlay={overlay}
                scale={scale}
              />
            </div>
          );
        })}
    </div>
  );
}

function ThumbnailOverlay({
  imageAssets,
  overlay,
  scale,
}: {
  imageAssets: ImageAsset[];
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
      const asset = imageAssets.find(
        (imageAsset) => imageAsset.id === overlay.assetId,
      );
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

const thumbnailWidth = 60;
const thumbnailPlaceholderHeight = 78;

export { PdfPageThumbnail };

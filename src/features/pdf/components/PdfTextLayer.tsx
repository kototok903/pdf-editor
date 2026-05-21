import { useEffect, useRef } from "react";
import { TextLayer } from "pdfjs-dist";

import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";
import "@/features/pdf/components/pdf-text-layer.css";

type PdfTextLayerProps = {
  pageNumber: number;
  pdfDocument: PDFDocumentProxy;
  scale: number;
  shouldRender: boolean;
};

function PdfTextLayer({
  pageNumber,
  pdfDocument,
  scale,
  shouldRender,
}: PdfTextLayerProps) {
  const textLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = textLayerRef.current;
    let isCancelled = false;
    let textLayer: InstanceType<typeof TextLayer> | null = null;

    if (!container) {
      return;
    }

    const textLayerContainer = container;

    textLayerContainer.replaceChildren();

    if (!shouldRender) {
      return;
    }

    async function renderTextLayer() {
      try {
        const page = await pdfDocument.getPage(pageNumber);

        if (isCancelled) {
          return;
        }

        const viewport = page.getViewport({ scale });
        textLayer = new TextLayer({
          container: textLayerContainer,
          textContentSource: page.streamTextContent({
            disableNormalization: true,
            includeMarkedContent: true,
          }),
          viewport,
        });

        await textLayer.render();

        if (!isCancelled) {
          const endOfContent = document.createElement("div");
          endOfContent.className = "endOfContent";
          textLayerContainer.append(endOfContent);
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof Error && error.name === "AbortException") {
          return;
        }

        textLayerContainer.replaceChildren();
      }
    }

    void renderTextLayer();

    return () => {
      isCancelled = true;
      textLayer?.cancel();
      textLayerContainer.replaceChildren();
    };
  }, [pageNumber, pdfDocument, scale, shouldRender]);

  return <div aria-hidden="true" className="textLayer" ref={textLayerRef} />;
}

export { PdfTextLayer };

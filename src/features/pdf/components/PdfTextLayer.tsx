import "@/features/pdf/components/pdf-text-layer.css";

import { TextLayer } from "pdfjs-dist";
import { useEffect, useRef } from "react";

import type { PDFDocumentProxy } from "@/features/pdf/pdf-types";

const textLayerEndMarkers = new Map<HTMLDivElement, HTMLDivElement>();
let textLayerSelectionAbortController: AbortController | null = null;
let previousSelectionRange: Range | null = null;

type PdfTextLayerProps = {
  onTextLayerRender?: (state: PdfTextLayerRenderState | null) => void;
  pdfDocument: PDFDocumentProxy;
  scale: number;
  shouldRender: boolean;
  sourcePageNumber: number;
};

export type PdfTextLayerRenderState = {
  element: HTMLDivElement;
  textContentItemsStr: string[];
  textDivs: HTMLElement[];
};

export function PdfTextLayer({
  onTextLayerRender,
  pdfDocument,
  scale,
  shouldRender,
  sourcePageNumber,
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
        const page = await pdfDocument.getPage(sourcePageNumber);

        if (isCancelled) {
          return;
        }

        const viewport = page.getViewport({ scale });
        textLayerContainer.style.setProperty(
          "--scale-factor",
          `${viewport.scale}`,
        );
        textLayerContainer.style.setProperty(
          "--user-unit",
          `${viewport.userUnit}`,
        );
        textLayerContainer.style.setProperty(
          "--total-scale-factor",
          "calc(var(--scale-factor) * var(--user-unit))",
        );
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
          markWhitespaceTextSpans(textLayerContainer);
          bindTextLayerSelection(textLayerContainer, endOfContent);
          onTextLayerRender?.({
            element: textLayerContainer,
            textContentItemsStr: textLayer.textContentItemsStr,
            textDivs: textLayer.textDivs,
          });
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
      unbindTextLayerSelection(textLayerContainer);
      onTextLayerRender?.(null);
      textLayer?.cancel();
      textLayerContainer.replaceChildren();
    };
  }, [onTextLayerRender, pdfDocument, scale, shouldRender, sourcePageNumber]);

  return <div aria-hidden="true" className="textLayer" ref={textLayerRef} />;
}

function bindTextLayerSelection(
  textLayer: HTMLDivElement,
  endOfContent: HTMLDivElement,
) {
  textLayerEndMarkers.set(textLayer, endOfContent);
  ensureTextLayerSelectionListener();
  textLayer.addEventListener("mousedown", handleTextLayerMouseDown);
}

function unbindTextLayerSelection(textLayer: HTMLDivElement) {
  textLayer.removeEventListener("mousedown", handleTextLayerMouseDown);
  const endOfContent = textLayerEndMarkers.get(textLayer);

  if (endOfContent) {
    resetTextLayerSelectionEnd(endOfContent, textLayer);
  }

  textLayerEndMarkers.delete(textLayer);

  if (textLayerEndMarkers.size === 0) {
    textLayerSelectionAbortController?.abort();
    textLayerSelectionAbortController = null;
    previousSelectionRange = null;
  }
}

function handleTextLayerMouseDown(event: MouseEvent) {
  if (event.currentTarget instanceof HTMLDivElement) {
    event.currentTarget.classList.add("selecting");
  }
}

function markWhitespaceTextSpans(textLayer: HTMLDivElement) {
  for (const span of textLayer.querySelectorAll("span:not(.markedContent)")) {
    if (span.textContent && /^\s+$/.test(span.textContent)) {
      span.classList.add("pdf-text-layer-spacer");
    }
  }
}

function ensureTextLayerSelectionListener() {
  if (textLayerSelectionAbortController) {
    return;
  }

  textLayerSelectionAbortController = new AbortController();
  const { signal } = textLayerSelectionAbortController;
  let isPointerDown = false;

  document.addEventListener(
    "pointerdown",
    () => {
      isPointerDown = true;
    },
    { signal },
  );
  document.addEventListener(
    "pointerup",
    () => {
      isPointerDown = false;
      resetAllTextLayerSelectionEnds();
    },
    { signal },
  );
  window.addEventListener(
    "blur",
    () => {
      isPointerDown = false;
      resetAllTextLayerSelectionEnds();
    },
    { signal },
  );
  document.addEventListener(
    "keyup",
    () => {
      if (!isPointerDown) {
        resetAllTextLayerSelectionEnds();
      }
    },
    { signal },
  );
  document.addEventListener("selectionchange", handleSelectionChange, {
    signal,
  });
}

function handleSelectionChange() {
  const selection = document.getSelection();

  if (!selection || selection.rangeCount === 0) {
    resetAllTextLayerSelectionEnds();
    previousSelectionRange = null;
    return;
  }

  const activeTextLayers = new Set<HTMLDivElement>();

  for (let rangeIndex = 0; rangeIndex < selection.rangeCount; rangeIndex += 1) {
    const range = selection.getRangeAt(rangeIndex);

    for (const textLayer of textLayerEndMarkers.keys()) {
      if (
        !activeTextLayers.has(textLayer) &&
        rangeIntersectsNode(range, textLayer)
      ) {
        activeTextLayers.add(textLayer);
      }
    }
  }

  for (const [textLayer, endOfContent] of textLayerEndMarkers) {
    if (activeTextLayers.has(textLayer)) {
      textLayer.classList.add("selecting");
    } else {
      resetTextLayerSelectionEnd(endOfContent, textLayer);
    }
  }

  const range = selection.getRangeAt(0);
  const isModifyingSelectionStart =
    previousSelectionRange !== null &&
    (range.compareBoundaryPoints(Range.END_TO_END, previousSelectionRange) ===
      0 ||
      range.compareBoundaryPoints(
        Range.START_TO_END,
        previousSelectionRange,
      ) === 0);
  const anchorNode = getSelectionAnchorNode(range, isModifyingSelectionStart);
  const anchorElement = getElementForNode(anchorNode);
  const parentTextLayer = anchorElement?.closest(".textLayer");

  if (parentTextLayer instanceof HTMLDivElement) {
    const endOfContent = textLayerEndMarkers.get(parentTextLayer);
    const insertionParent = anchorElement?.parentElement;

    if (endOfContent && insertionParent) {
      endOfContent.style.width = parentTextLayer.style.width;
      endOfContent.style.height = parentTextLayer.style.height;
      endOfContent.style.userSelect = "text";
      insertionParent.insertBefore(
        endOfContent,
        isModifyingSelectionStart ? anchorElement : anchorElement.nextSibling,
      );
    }
  }

  previousSelectionRange = range.cloneRange();
}

function getSelectionAnchorNode(
  range: Range,
  isModifyingSelectionStart: boolean,
) {
  let anchorNode: Node | null = isModifyingSelectionStart
    ? range.startContainer
    : range.endContainer;

  if (anchorNode.nodeType === Node.TEXT_NODE) {
    anchorNode = anchorNode.parentNode;
  }

  if (!isModifyingSelectionStart && range.endOffset === 0) {
    anchorNode = getPreviousSelectableNode(anchorNode);
  }

  return anchorNode;
}

function getPreviousSelectableNode(node: Node | null) {
  let previousNode = node;

  while (previousNode) {
    while (previousNode && !previousNode.previousSibling) {
      previousNode = previousNode.parentNode;

      if (previousNode instanceof HTMLDivElement) {
        return node;
      }
    }

    previousNode = previousNode?.previousSibling ?? null;

    if (previousNode?.childNodes.length) {
      return previousNode;
    }
  }

  return node;
}

function getElementForNode(node: Node | null) {
  if (node instanceof Element) {
    return node;
  }

  return node?.parentElement ?? null;
}

function rangeIntersectsNode(range: Range, node: Node) {
  try {
    return range.intersectsNode(node);
  } catch {
    return false;
  }
}

function resetAllTextLayerSelectionEnds() {
  for (const [textLayer, endOfContent] of textLayerEndMarkers) {
    resetTextLayerSelectionEnd(endOfContent, textLayer);
  }
}

function resetTextLayerSelectionEnd(
  endOfContent: HTMLDivElement,
  textLayer: HTMLDivElement,
) {
  textLayer.append(endOfContent);
  endOfContent.style.width = "";
  endOfContent.style.height = "";
  endOfContent.style.userSelect = "";
  textLayer.classList.remove("selecting");
}

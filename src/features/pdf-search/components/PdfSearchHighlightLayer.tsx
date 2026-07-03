import { memo, useEffect, useMemo, useRef, useState } from "react";

import type { PdfTextLayerRenderState } from "@/features/pdf/components/PdfTextLayer";
import type { PdfSearchMatch } from "@/features/pdf-search/pdf-search-types";
import { cn } from "@/lib/utils";

type PdfSearchHighlightLayerProps = {
  activeMatchId: string | null;
  matches: PdfSearchMatch[];
  pageElement: HTMLElement | null;
  textLayerRenderState: PdfTextLayerRenderState | null;
};

type SearchHighlightRect = {
  height: number;
  id: string;
  isActive: boolean;
  left: number;
  top: number;
  width: number;
};

export const PdfSearchHighlightLayer = memo(function PdfSearchHighlightLayer({
  activeMatchId,
  matches,
  pageElement,
  textLayerRenderState,
}: PdfSearchHighlightLayerProps) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const [highlightRects, setHighlightRects] = useState<SearchHighlightRect[]>(
    [],
  );
  const activeRectId = useMemo(
    () => highlightRects.find((rect) => rect.isActive)?.id ?? null,
    [highlightRects],
  );

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (!pageElement || !textLayerRenderState || matches.length === 0) {
        setHighlightRects([]);
        return;
      }

      setHighlightRects(
        createSearchHighlightRects({
          activeMatchId,
          matches,
          pageElement,
          textLayerRenderState,
        }),
      );
    });

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [activeMatchId, matches, pageElement, textLayerRenderState]);

  useEffect(() => {
    if (!activeRectId || !layerRef.current) {
      return;
    }

    const activeElement = layerRef.current.querySelector(
      `[data-search-highlight-id="${CSS.escape(activeRectId)}"]`,
    );

    if (activeElement instanceof HTMLElement) {
      activeElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
    }
  }, [activeRectId]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-2 overflow-hidden"
      ref={layerRef}
    >
      {highlightRects.map((rect) => (
        <span
          className={cn(
            "absolute rounded-[1px] bg-yellow-300/45 shadow-[0_0_0_1px_var(--color-yellow-400)]/45 mix-blend-multiply",
            "data-[active=true]:bg-primary/35 data-[active=true]:shadow-[0_0_0_1px_var(--primary)]/45",
          )}
          data-search-highlight-id={rect.id}
          data-active={rect.isActive}
          key={rect.id}
          style={{
            height: rect.height,
            left: rect.left,
            top: rect.top,
            width: rect.width,
          }}
        />
      ))}
    </div>
  );
});

PdfSearchHighlightLayer.displayName = "PdfSearchHighlightLayer";

function createSearchHighlightRects({
  activeMatchId,
  matches,
  pageElement,
  textLayerRenderState,
}: {
  activeMatchId: string | null;
  matches: PdfSearchMatch[];
  pageElement: HTMLElement;
  textLayerRenderState: PdfTextLayerRenderState;
}) {
  const pageBounds = pageElement.getBoundingClientRect();
  const highlightRects: SearchHighlightRect[] = [];
  const { textDivs } = textLayerRenderState;

  for (const match of matches) {
    let rectIndex = 0;
    const { begin, end } = match.range;

    for (
      let divIndex = begin.divIndex;
      divIndex <= end.divIndex;
      divIndex += 1
    ) {
      const textDiv = textDivs[divIndex];
      const textNode = textDiv?.firstChild;

      if (!(textDiv instanceof HTMLElement)) {
        continue;
      }

      const rangeStart = divIndex === begin.divIndex ? begin.offset : 0;
      const rangeEnd =
        divIndex === end.divIndex ? end.offset : getTextDivTextLength(textDiv);
      const domRects =
        textNode instanceof Text && rangeEnd > rangeStart
          ? getTextNodeRangeRects(textNode, rangeStart, rangeEnd)
          : Array.from(textDiv.getClientRects());

      for (const domRect of domRects) {
        if (domRect.width <= 0 || domRect.height <= 0) {
          continue;
        }

        highlightRects.push({
          height: domRect.height,
          id: `${match.id}-${rectIndex}`,
          isActive: match.id === activeMatchId,
          left: domRect.left - pageBounds.left,
          top: domRect.top - pageBounds.top,
          width: domRect.width,
        });
        rectIndex += 1;
      }
    }
  }

  return highlightRects;
}

function getTextDivTextLength(textDiv: HTMLElement) {
  const textNode = textDiv.firstChild;

  return textNode instanceof Text
    ? textNode.length
    : (textDiv.textContent?.length ?? 0);
}

function getTextNodeRangeRects(
  textNode: Text,
  rangeStart: number,
  rangeEnd: number,
) {
  const range = document.createRange();
  const safeRangeStart = Math.min(Math.max(0, rangeStart), textNode.length);
  const safeRangeEnd = Math.min(
    Math.max(safeRangeStart, rangeEnd),
    textNode.length,
  );

  range.setStart(textNode, safeRangeStart);
  range.setEnd(textNode, safeRangeEnd);

  const rects = Array.from(range.getClientRects());

  range.detach();

  return rects;
}

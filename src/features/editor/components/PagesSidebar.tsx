import { useCallback, useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/react";

import { PdfPageThumbnail } from "@/features/editor/components/PdfPageThumbnail";
import {
  getPageDropId,
  overlayLayerDragType,
  pageDropType,
} from "@/features/editor/components/sidebar-dnd";
import type { EditorOverlay, ImageAsset } from "@/features/editor/editor-types";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";
import { cn } from "@/lib/utils";

type PagesSidebarProps = {
  currentPage: number;
  document: LoadedPdfDocument | null;
  imageAssets: ImageAsset[];
  onSelectPage: (pageNumber: number) => void;
  overlays: EditorOverlay[];
  pageCount: number;
};

function PagesSidebar({
  currentPage,
  document,
  imageAssets,
  onSelectPage,
  overlays,
  pageCount,
}: PagesSidebarProps) {
  const pageButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const sidebarScrollerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocument = document?.pdfDocument;
  const [thumbnailPageState, setThumbnailPageState] = useState<{
    pages: Set<number>;
    pdfDocument: LoadedPdfDocument["pdfDocument"] | undefined;
  }>({
    pages: new Set([currentPage]),
    pdfDocument,
  });
  const renderableThumbnailPages =
    thumbnailPageState.pdfDocument === pdfDocument
      ? thumbnailPageState.pages
      : emptyPageSet;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const registerPageButton = useCallback(
    (pageNumber: number, element: HTMLButtonElement | null) => {
      if (element) {
        pageButtonRefs.current.set(pageNumber, element);
        return;
      }

      pageButtonRefs.current.delete(pageNumber);
    },
    [],
  );

  useEffect(() => {
    const sidebarScroller = sidebarScrollerRef.current;

    if (!sidebarScroller) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const intersectingPageNumbers = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) =>
            Number((entry.target as HTMLElement).dataset.pageNumber),
          )
          .filter(Number.isInteger);

        if (intersectingPageNumbers.length === 0) {
          return;
        }

        setThumbnailPageState((currentState) => {
          const nextPages = new Set(
            currentState.pdfDocument === pdfDocument
              ? currentState.pages
              : [currentPage],
          );

          for (const pageNumber of intersectingPageNumbers) {
            nextPages.add(pageNumber);
          }

          return {
            pages: nextPages,
            pdfDocument,
          };
        });
      },
      {
        root: sidebarScroller,
        rootMargin: "720px 0px",
      },
    );

    for (const element of pageButtonRefs.current.values()) {
      observer.observe(element);
    }

    return () => {
      observer.disconnect();
    };
  }, [currentPage, pageCount, pdfDocument]);

  useEffect(() => {
    pageButtonRefs.current.get(currentPage)?.scrollIntoView({
      block: "nearest",
    });
  }, [currentPage]);

  return (
    <aside className="flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="shrink-0 border-b border-sidebar-border p-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span>Page</span>
          <span className="text-muted-foreground">
            {pageCount > 0 ? `${currentPage}/${pageCount}` : "0/0"}
          </span>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2"
        ref={sidebarScrollerRef}
      >
        {pages.length > 0 && document ? (
          pages.map((page) => (
            <SidebarPageButton
              imageAssets={imageAssets}
              isActive={page === currentPage}
              key={page}
              onClick={() => onSelectPage(page)}
              overlays={overlays}
              pageNumber={page}
              pdfDocument={document.pdfDocument}
              registerPageButton={registerPageButton}
              shouldRenderThumbnail={
                page === currentPage || renderableThumbnailPages.has(page)
              }
            />
          ))
        ) : (
          <div className="w-15 h-20 rounded-md border border-dashed bg-page/70" />
        )}
      </div>
    </aside>
  );
}

function SidebarPageButton({
  imageAssets,
  isActive,
  onClick,
  overlays,
  pageNumber,
  pdfDocument,
  registerPageButton,
  shouldRenderThumbnail,
}: {
  imageAssets: ImageAsset[];
  isActive: boolean;
  onClick: () => void;
  overlays: EditorOverlay[];
  pageNumber: number;
  pdfDocument: LoadedPdfDocument["pdfDocument"];
  registerPageButton: (
    pageNumber: number,
    element: HTMLButtonElement | null,
  ) => void;
  shouldRenderThumbnail: boolean;
}) {
  const { isDropTarget, ref } = useDroppable({
    accept: overlayLayerDragType,
    data: { pageNumber },
    id: getPageDropId(pageNumber),
    type: pageDropType,
  });
  const setButtonRef = useCallback(
    (element: HTMLButtonElement | null) => {
      registerPageButton(pageNumber, element);
      ref(element);
    },
    [pageNumber, ref, registerPageButton],
  );

  return (
    <button
      aria-current={isActive ? "page" : undefined}
      aria-label={`Go to page ${pageNumber}`}
      className={cn(
        "relative mx-auto block overflow-hidden rounded-md border-2 border-border bg-page text-page-foreground shadow-sm transition-colors data-[active=true]:border-primary",
        isDropTarget && "border-primary ring-2 ring-primary/35",
      )}
      data-active={isActive}
      data-page-number={pageNumber}
      onClick={onClick}
      ref={setButtonRef}
      type="button"
    >
      <PdfPageThumbnail
        imageAssets={imageAssets}
        overlays={overlays}
        pageNumber={pageNumber}
        pdfDocument={pdfDocument}
        shouldRender={shouldRenderThumbnail}
      />
      <span
        className={cn(
          "absolute right-0 bottom-0 min-w-5 rounded-tl-lg px-1 py-0.5 -mr-px -mb-px ring-2 text-center text-xs font-semibold leading-none",
          isActive
            ? "bg-primary text-primary-foreground ring-primary"
            : "bg-toolbar-button text-toolbar-foreground ring-border",
        )}
      >
        {pageNumber}
      </span>
    </button>
  );
}

const emptyPageSet = new Set<number>();

export { PagesSidebar };

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/react";

import { PageThumbnailButton } from "@/features/editor/components/PageThumbnailButton";
import {
  getPageDropId,
  overlayLayerDragType,
  pageDropType,
} from "@/features/editor/components/sidebar-dnd";
import type {
  DocumentPage,
  EditorOverlay,
  ImageAsset,
} from "@/features/editor/editor-types";
import { getSidebarThumbnailRenderPages } from "@/features/editor/lib/pages-sidebar-utils";
import type { LoadedPdfDocument } from "@/features/pdf/pdf-types";

type PagesSidebarProps = {
  currentPage: number;
  document: LoadedPdfDocument | null;
  documentPages: DocumentPage[];
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  onSelectPage: (pageNumber: number) => void;
  overlaysByPage: ReadonlyMap<number, EditorOverlay[]>;
  pageCount: number;
  sourceDocumentsById: ReadonlyMap<string, LoadedPdfDocument>;
};

export const PagesSidebar = memo(function PagesSidebar({
  currentPage,
  document,
  documentPages,
  imageAssetById,
  onSelectPage,
  overlaysByPage,
  pageCount,
  sourceDocumentsById,
}: PagesSidebarProps) {
  const pageButtonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const sidebarScrollerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocument = document?.pdfDocument;
  const [thumbnailPageState, setThumbnailPageState] = useState<{
    pages: Set<number>;
    pdfDocument: LoadedPdfDocument["pdfDocument"] | undefined;
  }>({
    pages: new Set(),
    pdfDocument,
  });
  const renderableThumbnailPages = useMemo(
    () =>
      getSidebarThumbnailRenderPages({
        currentPage,
        intersectingPages:
          thumbnailPageState.pdfDocument === pdfDocument
            ? thumbnailPageState.pages
            : emptyPageSet,
        overscan: sidebarCurrentPageThumbnailOverscan,
        pageCount,
      }),
    [currentPage, pageCount, pdfDocument, thumbnailPageState],
  );
  const pages = documentPages.map((documentPage, index) => ({
    documentPage,
    pageNumber: index + 1,
  }));
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

    const intersectingPages = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        let didChange = false;

        for (const entry of entries) {
          const pageNumber = Number(
            (entry.target as HTMLElement).dataset.pageNumber,
          );

          if (!Number.isInteger(pageNumber)) {
            continue;
          }

          if (entry.isIntersecting) {
            if (!intersectingPages.has(pageNumber)) {
              intersectingPages.add(pageNumber);
              didChange = true;
            }
          } else if (intersectingPages.delete(pageNumber)) {
            didChange = true;
          }
        }

        if (!didChange) {
          return;
        }

        setThumbnailPageState({
          pages: new Set(intersectingPages),
          pdfDocument,
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
  }, [pageCount, pdfDocument]);

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
          <span
            className="text-muted-foreground text-right"
            style={{
              minWidth: `${String(pageCount).length * 2}ch`,
            }}
          >
            {pageCount > 0 ? `${currentPage}/${pageCount}` : "0/0"}
          </span>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-2"
        ref={sidebarScrollerRef}
      >
        {pages.length > 0 && document ? (
          pages.map(({ documentPage, pageNumber }) => {
            const sourceDocument = sourceDocumentsById.get(
              documentPage.sourceId,
            );

            return (
              <SidebarPageButton
                imageAssetById={imageAssetById}
                isActive={pageNumber === currentPage}
                key={documentPage.id}
                onSelectPage={onSelectPage}
                pageOverlays={
                  overlaysByPage.get(pageNumber) ?? emptyPageOverlays
                }
                pageRotationDegrees={documentPage.rotationDegrees}
                pageNumber={pageNumber}
                pdfDocument={
                  sourceDocument?.pdfDocument ?? document.pdfDocument
                }
                registerPageButton={registerPageButton}
                shouldRenderThumbnail={
                  Boolean(sourceDocument) &&
                  renderableThumbnailPages.has(pageNumber)
                }
                sourcePageNumber={documentPage.sourcePageNumber}
              />
            );
          })
        ) : (
          <div className="w-15 h-20 rounded-md border border-dashed" />
        )}
      </div>
    </aside>
  );
});

PagesSidebar.displayName = "PagesSidebar";

const SidebarPageButton = memo(function SidebarPageButton({
  imageAssetById,
  isActive,
  onSelectPage,
  pageOverlays,
  pageRotationDegrees,
  pageNumber,
  pdfDocument,
  registerPageButton,
  shouldRenderThumbnail,
  sourcePageNumber,
}: {
  imageAssetById: ReadonlyMap<string, ImageAsset>;
  isActive: boolean;
  onSelectPage: (pageNumber: number) => void;
  pageOverlays: EditorOverlay[];
  pageRotationDegrees?: number;
  pageNumber: number;
  pdfDocument: LoadedPdfDocument["pdfDocument"];
  registerPageButton: (
    pageNumber: number,
    element: HTMLButtonElement | null,
  ) => void;
  shouldRenderThumbnail: boolean;
  sourcePageNumber: number;
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
  const handleClick = useCallback(() => {
    onSelectPage(pageNumber);
  }, [onSelectPage, pageNumber]);

  return (
    <PageThumbnailButton
      onClick={handleClick}
      buttonRef={setButtonRef}
      imageAssetById={imageAssetById}
      isActive={isActive}
      isDropTarget={isDropTarget}
      pageNumber={pageNumber}
      pageOverlays={pageOverlays}
      pageRotationDegrees={pageRotationDegrees}
      pdfDocument={pdfDocument}
      shouldRenderThumbnail={shouldRenderThumbnail}
      sourcePageNumber={sourcePageNumber}
      cornerSlots={{ br: pageNumber }}
    />
  );
});

SidebarPageButton.displayName = "SidebarPageButton";

const emptyPageSet = new Set<number>();
const emptyPageOverlays: EditorOverlay[] = [];
const sidebarCurrentPageThumbnailOverscan = 2;
